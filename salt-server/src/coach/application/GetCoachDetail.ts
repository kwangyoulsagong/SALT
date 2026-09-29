import {
  COACH_EXCLUDED,
  coachSignalType,
  JUDGMENT_CASE_LIMIT,
  readStoredRecommendation,
  recommendationGate,
  staleHours,
  summarizeRecommendationTrack,
  toBehaviorFact,
  toDetailAssetType,
  toExitPlan,
  type BehaviorAnalyzer,
  type BehaviorFact,
  type BehaviorFinding,
  type Clock,
  type CoachInsight,
  type CoachInsightStore,
  type ExitPlanView,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type RecommendationBlockedReason,
  type RecommendationSnapshotStore,
  type RecommendationTrackRecord,
  type StoredRecommendation,
} from "../domain";
import { JUDGMENT_DISCLAIMER, SCORE_NOTE } from "./lib/judgmentTrack";
/** 행동 기록 수 — 행동 코치 화면과 같은 10. */
const BEHAVIOR_LIMIT = 10;
/** 익절 계획이 보는 자산군 — `ListProfitPlans` 와 같다. 손절 · 익절 비율이 자산군마다 다르다. */
const EXIT_PLAN_ASSET_TYPE = "crypto" as const;

export interface CoachDetailView {
  generatedAt: string | null;
  staleHours: number | null;
  regime: string | null;
  recommendation: {
    action: StoredRecommendation["action"];
    symbol: string;
    assetType: "crypto" | "us_stock";
    score: number;
    scoreNote: string;
    renderable: boolean;
    blockedReason: RecommendationBlockedReason | null;
    reasons: StoredRecommendation["reasons"];
    topFactors: StoredRecommendation["topFactors"];
    signalTrackRecord: RecommendationTrackRecord | null;
    /** 같은 행동의 저장 추천 중 30일 뒤 **빗나간** 것 — 최근 3건(F010 슬라이스 0). */
    failureCases: Array<{ date: string; event: string; outcome: string; symbol: string; returnRate: number }>;
    explanation: { text: string; source: "llm" | "rule" };
  } | null;
  risks: StoredRecommendation["risks"];
  candidates: Array<{
    action: string;
    symbol: string;
    score: number;
    reasons: string[];
  }>;
  exitPlans: ExitPlanView[];
  behaviorFacts: BehaviorFact[];
  excluded: typeof COACH_EXCLUDED;
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
    private readonly forecasts: Pick<ForecastReader, "symbolRisk"> | null = null
  ) {}

  async execute(userId: string): Promise<CoachDetailView> {
    const now = this.clock();

    const [latest, holdings, behaviors] = await Promise.all([
      this.insights.findLatestRecommendation(userId),
      this.portfolio.listHoldings(userId, EXIT_PLAN_ASSET_TYPE),
      this.behavior
        ? this.behavior.execute(userId, now).catch((): BehaviorFinding[] => [])
        : Promise.resolve<BehaviorFinding[]>([]),
    ]);

    const stored = latest
      ? readStoredRecommendation(latest.payload, latest.createdAt)
      : null;
    // 변동성 실패는 상세를 막지 않는다 — 익절 계획만 고정 비율로
    const risk =
      this.forecasts && holdings.length
        ? await this.forecasts
            .symbolRisk(holdings.map((holding) => holding.symbol))
            .catch(() => null)
        : null;

    const recommendation = stored
      ? await this.assembleRecommendation(userId, latest!, stored)
      : null;

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
      excluded: COACH_EXCLUDED,
      disclaimer: JUDGMENT_DISCLAIMER,
    };
  }

  private async assembleRecommendation(
    userId: string,
    insight: CoachInsight,
    stored: StoredRecommendation
  ): Promise<NonNullable<CoachDetailView["recommendation"]>> {
    const signalType = coachSignalType(stored.action);
    const filter = { signalType };

    const [stats, misses, quotes] = await Promise.all([
      this.recommendations.summarize(userId, filter),
      this.recommendations.recentCases(userId, filter, "miss", JUDGMENT_CASE_LIMIT),
      this.market.quotes([stored.symbol]),
    ]);
    const trackRecord: RecommendationTrackRecord = summarizeRecommendationTrack(signalType, stats);
    const failureCases = misses.map((item) => ({
      date: item.judgedAt.toISOString().slice(0, 10),
      event: signalType,
      outcome: item.outcome,
      symbol: item.symbol,
      returnRate: item.returnRate,
    }));

    const gate = recommendationGate({
      reasons: stored.reasons,
      topFactors: stored.topFactors,
      trackRecord,
      failureCases,
    });

    return {
      action: stored.action,
      symbol: stored.symbol,
      assetType: toDetailAssetType(
        quotes.get(stored.symbol)?.assetType ?? "crypto"
      ),
      score: stored.score,
      scoreNote: SCORE_NOTE,
      renderable: gate.renderable,
      blockedReason: gate.blockedReason,
      reasons: stored.reasons,
      topFactors: stored.topFactors,
      signalTrackRecord: trackRecord,
      failureCases,
      // 저장 추천의 요약은 규칙 문장이다 — `generate` 가 LLM 을 부르지 않는다
      explanation: { text: insight.summary, source: "rule" },
    };
  }
}
