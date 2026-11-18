import {
  coachSignalType,
  JUDGMENT_CASE_LIMIT,
  readStoredRecommendation,
  recommendationGate,
  staleHours,
  summarizeRecommendationTrack,
  toDetailAssetType,
  type Clock,
  type CoachInsight,
  type CoachInsightStore,
  type MarketProbe,
  type RecommendationBlockedReason,
  type RecommendationSnapshotStore,
  type RecommendationTrackRecord,
  type StoredRecommendation,
} from "../../domain";
import { SCORE_NOTE } from "./judgmentTrack";

/**
 * 저장 추천 카드 한 장 — 저장 추천 + 같은 행동의 성적 · 빗나간 사례 + 3종 게이트(`recommendationGate`).
 *
 * 코치 상세(`GetCoachDetail`)와 코치 대화 카드 · 브리핑(F006 C절 FR-24 · 25 · `SRV-REQ-028` FR-50~54)이 **같은 조립**을 쓴다 —
 * 게이트를 두 곳에 두면 한쪽만 고쳐진다. 카드는 읽기만 한다(추천을 새로 만들지 않는다).
 */
export interface RecommendationCardView {
  action: StoredRecommendation["action"];
  symbol: string;
  assetType: "crypto" | "us_stock" | "kr_stock";
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
}

export interface RecommendationCardDeps {
  market: Pick<MarketProbe, "quotes">;
  recommendations: Pick<RecommendationSnapshotStore, "summarize" | "recentCases">;
}

export const assembleRecommendationCard = async (
  deps: RecommendationCardDeps,
  userId: string,
  insight: CoachInsight,
  stored: StoredRecommendation
): Promise<RecommendationCardView> => {
  const signalType = coachSignalType(stored.action);
  const filter = { signalType };

  const [stats, misses, quotes] = await Promise.all([
    deps.recommendations.summarize(userId, filter),
    deps.recommendations.recentCases(userId, filter, "miss", JUDGMENT_CASE_LIMIT),
    deps.market.quotes([stored.symbol]),
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
    assetType: toDetailAssetType(quotes.get(stored.symbol)?.assetType ?? "crypto"),
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
};

/**
 * 대화에 복사해 저장하는 카드(`DB-REQ-021` FR-4 · 5 · `DB-REQ-022` FR-10~14).
 *
 * - 게이트를 지난 카드는 그대로 + 판단 시각(`generatedAt` — FR-27 생성 시각)
 * - **막힌 카드에는 행동 · 종목 · 점수 · 근거가 없다**(`DB-REQ-022` FR-12 — 추천 내용을 만들지 않는다). 게이트 칸 넷과
 *   표본만 남겨 화면이 회색 사유 상자를 그린다(FEATURE-006 UX "Blocked")
 */
export type ConversationCardPayload =
  | (RecommendationCardView & { renderable: true; generatedAt: string })
  | {
      renderable: false;
      blockedReason: RecommendationBlockedReason;
      signalTrackRecord: RecommendationTrackRecord | null;
      failureCases: [];
      generatedAt: string;
    };

export interface ConversationCard {
  insightId: string;
  payload: ConversationCardPayload;
  /** 문장을 만드는 데 쓰는 요약 — 저장하지 않는다 */
  summary: { renderable: boolean; symbol: string | null; staleHours: number };
}

/** 사용자의 가장 최근 저장 추천을 대화 카드로. 추천이 없으면 `null` */
export class ReadConversationCard {
  constructor(
    private readonly insights: Pick<CoachInsightStore, "findLatestRecommendation">,
    private readonly deps: RecommendationCardDeps,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(userId: string): Promise<ConversationCard | null> {
    const latest = await this.insights.findLatestRecommendation(userId);
    const stored = latest ? readStoredRecommendation(latest.payload, latest.createdAt) : null;
    if (!latest || !stored) return null;
    const card = await assembleRecommendationCard(this.deps, userId, latest, stored);
    const generatedAt = stored.generatedAt.toISOString();
    const stale = staleHours(stored.generatedAt, this.clock());
    if (card.renderable) {
      return {
        insightId: latest.id,
        payload: { ...card, renderable: true, generatedAt },
        summary: { renderable: true, symbol: card.symbol, staleHours: stale },
      };
    }
    return {
      insightId: latest.id,
      payload: {
        renderable: false,
        blockedReason: card.blockedReason ?? "reasons_missing",
        signalTrackRecord: card.signalTrackRecord,
        failureCases: [],
        generatedAt,
      },
      summary: { renderable: false, symbol: null, staleHours: stale },
    };
  }
}
