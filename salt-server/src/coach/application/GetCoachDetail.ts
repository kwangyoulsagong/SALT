import {
  coachExclusions,
  KR_STOCK_JUDGMENT_SIGNAL_TYPES,
  type CoachExclusion,
  type SymbolJudgmentStore,
  readStoredRecommendation,
  staleHours,
  toBehaviorFact,
  toExitPlan,
  type BehaviorAnalyzer,
  type BehaviorFact,
  type BehaviorFinding,
  type Clock,
  type CoachInsightStore,
  type ExitPlanView,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type RecommendationSnapshotStore,
  type StoredRecommendation,
} from "../domain";
import { JUDGMENT_DISCLAIMER } from "./lib/judgmentTrack";
import { assembleRecommendationCard, type RecommendationCardView } from "./lib/recommendationCard";
/** 행동 기록 수 — 행동 코치 화면과 같은 10. */
const BEHAVIOR_LIMIT = 10;
/** 익절 계획이 보는 자산군 — `ListProfitPlans` 와 같다. 손절 · 익절 비율이 자산군마다 다르다. */
const EXIT_PLAN_ASSET_TYPE = "crypto" as const;

export interface CoachDetailView {
  generatedAt: string | null;
  staleHours: number | null;
  regime: string | null;
  recommendation: RecommendationCardView | null;
  risks: StoredRecommendation["risks"];
  candidates: Array<{
    action: string;
    symbol: string;
    score: number;
    reasons: string[];
  }>;
  exitPlans: ExitPlanView[];
  behaviorFacts: BehaviorFact[];
  excluded: CoachExclusion[];
  disclaimer: string;
}

/**
 * 코치 상세 — 저장된 추천 + 성적 + 익절 계획 + 행동 기록 (`SRV-REQ-025` FR-1~9 · 18).
 *
 * ## 읽기만 한다
 *
 * 추천을 새로 만들지 않는다(`generate` 의 일). 행동 기록은 요청 때 센다 — 판정이 저장하지 않는
 * 측정이 된 뒤(FEATURE-009 FR-21) GET 이 쓰기를 하지 않는다는 원칙과 부딪치지 않는다.
 * 행동 판정이 실패해도 나머지는 나간다 — 행동 기록은 빈 배열이다. 만료가 지난 추천도 준다 — `staleHours` 가
 * 그 사실을 화면에 알린다(FR-18).
 *
 * ## 성적 · 실패사례는 추천 스냅샷 원장에서 (F010 슬라이스 0)
 *
 * 전에는 실패사례 출처가 없어 추천 블록이 전부 `failure_cases_missing` 으로 막혔다. 이제 같은 행동
 * (`coach.<action>`)의 저장 추천을 30일 뒤 채점한 스냅샷에서 적중률과 빗나간 사례를 읽는다. 표본 20 미만이면
 * `insufficient_sample` — 에러가 아니고 200 이다(FR-2 · FR-4). 종목 판단 스냅샷은 빌리지 않는다(`policy/coachDetail` 주석).
 *
 * 추천이 없어도(첫 생성 전) 익절 계획 · 행동 기록은 준다 — 둘은 보유 · 거래에서 온다.
 */
export class GetCoachDetail {
  constructor(
    private readonly insights: CoachInsightStore,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly recommendations: RecommendationSnapshotStore,
    private readonly clock: Clock = () => new Date(),
    private readonly behavior: BehaviorAnalyzer | null = null,
    /** 익절 계획의 실현 변동성(F010 슬라이스 2). 없으면 고정 비율 */
    private readonly forecasts: Pick<ForecastReader, "symbolRisk"> | null = null,
    /** 국내 주식 판단 표본 진행(F011 FR-62) — 없으면 0 으로 센다 */
    private readonly judgments: Pick<SymbolJudgmentStore, "summarize"> | null = null
  ) {}

  /** 국내 주식 장기 판단 유형별 라이브 표본. 읽기 실패는 상세를 막지 않는다 — 0 으로 */
  private async krGroupSamples(): Promise<number[]> {
    if (!this.judgments) return [];
    const judgments = this.judgments;
    return Promise.all(
      KR_STOCK_JUDGMENT_SIGNAL_TYPES.map((signalType) =>
        judgments
          .summarize(signalType)
          .then((stats) => stats.sample)
          .catch(() => 0)
      )
    );
  }

  async execute(userId: string): Promise<CoachDetailView> {
    const now = this.clock();

    const [latest, holdings, behaviors, krSamples] = await Promise.all([
      this.insights.findLatestRecommendation(userId),
      this.portfolio.listHoldings(userId, EXIT_PLAN_ASSET_TYPE),
      this.behavior
        ? this.behavior.execute(userId, now).catch((): BehaviorFinding[] => [])
        : Promise.resolve<BehaviorFinding[]>([]),
      this.krGroupSamples(),
    ]);

    const stored = latest
      ? readStoredRecommendation(latest.payload, latest.createdAt)
      : null;
    // 둘은 서로 모른다 — 차례로 기다리면 상세 지연이 두 호출의 합이 된다(`SRV-REQ-027` FR-30)
    const [risk, recommendation] = await Promise.all([
      // 변동성 실패는 상세를 막지 않는다 — 익절 계획만 고정 비율로
      this.forecasts && holdings.length
        ? this.forecasts
            .symbolRisk(holdings.map((holding) => holding.symbol))
            .catch(() => null)
        : Promise.resolve(null),
      stored
        ? assembleRecommendationCard(
            { market: this.market, recommendations: this.recommendations },
            userId,
            latest!,
            stored
          )
        : Promise.resolve(null),
    ]);

    return {
      generatedAt: stored?.generatedAt.toISOString() ?? null,
      staleHours: stored ? staleHours(stored.generatedAt, now) : null,
      regime: stored?.regime ?? null,
      recommendation,
      risks: stored?.risks ?? [],
      // 저장 payload 의 후보에는 근거가 없다(`explainRecommendation` 이 점수만 싣는다).
      // 빈 배열은 "근거 없음"이 아니라 "싣지 않았다"다 — 생성 쪽 변경은 별 작업이다
      candidates: (stored?.candidates ?? []).map((candidate) => ({
        ...candidate,
        reasons: [],
      })),
      exitPlans: holdings.map((holding) =>
        toExitPlan(
          holding,
          EXIT_PLAN_ASSET_TYPE,
          risk?.get(holding.symbol.toUpperCase())?.annualized ?? null
        )
      ),
      behaviorFacts: [...behaviors]
        .sort((a, b) => b.severity - a.severity)
        .slice(0, BEHAVIOR_LIMIT)
        .map((finding) => toBehaviorFact({ ...finding.payload }))
        .filter((fact): fact is BehaviorFact => fact !== null),
      excluded: coachExclusions(krSamples),
      disclaimer: JUDGMENT_DISCLAIMER,
    };
  }
}
