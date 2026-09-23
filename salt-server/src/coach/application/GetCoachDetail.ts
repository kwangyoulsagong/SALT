import {
  COACH_EXCLUDED,
  coachSignalType,
  isFeedbackInsight,
  readStoredRecommendation,
  recommendationGate,
  staleHours,
  summarizePerformance,
  summarizeRecommendationTrack,
  toBehaviorFact,
  toDetailAssetType,
  toExitPlan,
  type BehaviorFact,
  type Clock,
  type CoachInsight,
  type CoachInsightStore,
  type ExitPlanView,
  type MarketProbe,
  type PortfolioProbe,
  type RecommendationBlockedReason,
  type RecommendationTrackRecord,
  type StoredRecommendation,
} from "../domain";
import { JUDGMENT_DISCLAIMER, SCORE_NOTE } from "./lib/judgmentTrack";
import { collectPerformanceSamples } from "./lib/performanceSamples";

/** 성적 표본을 뽑는 판단 수 상한 — `signal-performance` 와 같은 100. */
const HISTORY_LIMIT = 100;
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
    failureCases: Array<{ date: string; event: string; outcome: string }>;
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
 * 추천을 새로 만들지 않고(`generate` 의 일) 행동 분석도 다시 돌리지 않는다 — 행동 코치
 * 화면(`GetBehaviorCoach`)은 열 때 분석을 돌리지만, 상세는 **이미 있는 것을 모아 보여주는
 * 화면**이라 GET 이 쓰기를 하지 않게 뒀다. 만료가 지난 추천도 준다 — `staleHours` 가
 * 그 사실을 화면에 알린다(FR-18).
 *
 * ## 추천 블록은 지금 전부 막힌다
 *
 * 실패사례 출처(`IndicatorTrackRecord`)가 아직 없다. `failureCases` 가 늘 빈 배열이고
 * 게이트가 `failure_cases_missing` 으로 막는다 — 에러가 아니고 200 이다(FR-2 · FR-4).
 * 종목 판단 스냅샷의 실패사례를 빌려 오지 않는 이유는 `domain/policy/coachDetail` 주석.
 *
 * 추천이 없어도(첫 생성 전) 익절 계획 · 행동 기록은 준다 — 둘은 보유 · 거래에서 온다.
 */
export class GetCoachDetail {
  constructor(
    private readonly insights: CoachInsightStore,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(userId: string): Promise<CoachDetailView> {
    const now = this.clock();

    const [latest, holdings, behaviors] = await Promise.all([
      this.insights.findLatestRecommendation(userId),
      this.portfolio.listHoldings(userId, EXIT_PLAN_ASSET_TYPE),
      this.insights.findActiveBehavior(userId, BEHAVIOR_LIMIT),
    ]);

    const stored = latest
      ? readStoredRecommendation(latest.payload, latest.createdAt)
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
        toExitPlan(holding, EXIT_PLAN_ASSET_TYPE)
      ),
      behaviorFacts: behaviors
        .map((insight) => toBehaviorFact(insight.payload))
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

    const [trackRecord, quotes] = await Promise.all([
      this.trackRecord(userId, stored.action, signalType),
      this.market.quotes([stored.symbol]),
    ]);

    // 실패사례 출처(`IndicatorTrackRecord`)가 없다 — 클래스 주석
    const failureCases: Array<{ date: string; event: string; outcome: string }> = [];

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

  /**
   * `coach.<action>` 의 성적 — 이 사용자의 저장 추천 중 **같은 행동**만 센다.
   *
   * `signal-performance` 무인자 호출은 신호 키를 `mode ?? action` 폴백 체인으로 만든다.
   * 새 코드는 그 체인을 쓰지 않는다(`SRV-REQ-024` FR-130) — 매핑 표의 키로 직접 거른다.
   * 표본을 세는 함수는 같다(`collectPerformanceSamples`).
   */
  private async trackRecord(
    userId: string,
    action: StoredRecommendation["action"],
    signalType: string
  ): Promise<RecommendationTrackRecord> {
    const history = await this.insights.findRecommendationHistory(
      userId,
      undefined,
      HISTORY_LIMIT
    );

    const rows = history
      .filter((row) => !isFeedbackInsight(row))
      .map((row) => ({
        insight: row,
        stored: readStoredRecommendation(row.payload, row.createdAt),
      }))
      .filter(({ stored }) => stored?.action === action)
      .map(({ insight, stored }) => ({
        insight,
        identity: { symbol: stored!.symbol, signalKey: signalType },
      }));

    const samples = await collectPerformanceSamples(this.market, rows);

    return summarizeRecommendationTrack(signalType, summarizePerformance(samples));
  }
}
