import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  BehaviorAnalyzer,
  BehaviorFinding,
  CoachHolding,
  CoachInsight,
  CoachInsightStore,
  MarketProbe,
  PortfolioProbe,
  RecommendationCase,
  RecommendationSnapshotStore,
} from "../../domain";
import { GetCoachDetail } from "../GetCoachDetail";

/**
 * 코치 상세 조립 (`SRV-REQ-025` FR-1~9 · 18).
 *
 * 저장소 · 시세 · 보유는 가짜다. 확인하는 것은 **무엇을 어디서 가져와 어떻게 막는가**다.
 */

const T0 = new Date("2026-09-01T00:00:00Z");
const NOW = new Date(T0.getTime() + 27.5 * 3_600_000);

const insight = (over: Partial<CoachInsight> = {}): CoachInsight => ({
  id: "i1",
  type: "ai_coach",
  symbol: null,
  dedupeKey: "main_coach",
  title: "AI 투자 코치",
  summary: "규칙 문장",
  severity: 50,
  confidence: 0.4,
  payload: {
    recommendation: { action: "buy", symbol: "BTC", score: 72 },
    candidates: [{ action: "buy", symbol: "BTC", score: 72 }],
    market: { regime: "sideways" },
    reasons: [{ type: "rsi", message: "RSI 과매도", value: 10 }],
    risks: [],
    debug: { topCandidateFactors: [{ key: "rsi", score: 10, message: "RSI 과매도" }] },
    generatedAt: T0.toISOString(),
  },
  createdAt: T0,
  expiresAt: null,
  ...over,
});

const store = (
  latest: CoachInsight | null,
  history: CoachInsight[] = latest ? [latest] : []
): CoachInsightStore =>
  ({
    findLatestRecommendation: async () => latest,
    findRecommendationHistory: async () => history,
  }) as unknown as CoachInsightStore;

const market = (): MarketProbe =>
  ({
    quotes: async () =>
      new Map([["BTC", { symbol: "BTC", assetType: "crypto", currentPrice: 110, change24h: 0, priceUpdatedAt: T0 }]]),
  }) as unknown as MarketProbe;

/**
 * 추천 스냅샷 원장(F010 슬라이스 0)의 가짜. `sample` 건 중 `misses` 건이 빗나갔고, 필터가 요구한 신호 유형만 기억한다.
 */
const ledger = (sample: number, misses: number, aboveCost = Math.floor(sample / 2)) => {
  const asked: string[] = [];
  const store = {
    summarize: async (_u: string, filter: { signalType?: string }) => {
      asked.push(filter.signalType ?? "*");
      return { sample, hits: sample - misses, aboveCost, avgReturn: sample ? 0.02 : null, worstReturn: sample ? -0.1 : null };
    },
    recentCases: async (): Promise<RecommendationCase[]> =>
      Array.from({ length: Math.min(misses, 3) }, (_, i) => ({
        symbol: "BTC",
        action: "buy",
        judgedAt: new Date(T0.getTime() - (i + 1) * 86_400_000),
        entryPrice: 100,
        exitPrice: 90,
        returnRate: -0.1,
        outcome: "miss",
      })),
  } as unknown as RecommendationSnapshotStore;
  return { store, asked };
};

const holding: CoachHolding = {
  symbol: "ETH",
  totalQuantity: 1,
  averageBuyPrice: 1000,
  totalInvested: 1000,
  currentPrice: 1200,
  currentValue: 1200,
  unrealizedProfit: 200,
  unrealizedProfitRate: 5,
  realizedProfit: 0,
};

const portfolio = (holdings: CoachHolding[] = []): PortfolioProbe =>
  ({ listHoldings: async () => holdings }) as unknown as PortfolioProbe;

const detail = (
  s: CoachInsightStore,
  p = portfolio(),
  m = market(),
  behavior: BehaviorAnalyzer | null = null,
  recommendations: RecommendationSnapshotStore = ledger(0, 0).store
) => new GetCoachDetail(s, m, p, recommendations, () => NOW, behavior);

const finding = (payload: Record<string, unknown>, severity = 50): BehaviorFinding =>
  ({ dedupeKey: String(payload.kind), title: "t", summary: "s", severity, confidence: 0.5, payload }) as unknown as BehaviorFinding;

describe("GetCoachDetail", () => {
  it("추천이 없으면 recommendation · staleHours 가 null 이고 나머지는 준다", async () => {
    const view = await detail(store(null), portfolio([holding])).execute("u1");

    assert.equal(view.recommendation, null);
    assert.equal(view.staleHours, null);
    assert.equal(view.generatedAt, null);
    assert.equal(view.exitPlans.length, 1);
    // 판단 표본 저장소가 없으면 0 — 국내 주식은 표본 20 전이다(F011 FR-62)
    assert.deepEqual(view.excluded, [
      { assetType: "kr_stock", reasonCode: "insufficient_history", progress: { largestGroupSample: 0, requiredSample: 20 } },
    ]);
    assert.ok(view.disclaimer.length > 0);
  });

  it("표본이 없으면 sample: 0 이고 signal_track_record_missing 이다 — 200 모양 그대로", async () => {
    const view = await detail(store(insight())).execute("u1");
    const rec = view.recommendation!;

    assert.equal(rec.renderable, false);
    assert.equal(rec.blockedReason, "signal_track_record_missing");
    assert.equal(rec.signalTrackRecord!.sample, 0);
    assert.equal(rec.signalTrackRecord!.winRate, null);
    assert.deepEqual(rec.failureCases, []);
    assert.equal(rec.scoreNote, "점수는 확률이 아닙니다");
    assert.equal(rec.assetType, "crypto");
    assert.deepEqual(rec.explanation, { text: "규칙 문장", source: "rule" });
  });

  it("성적은 같은 행동(coach.<action>)의 원장만 묻고, 표본 20 미만이면 insufficient_sample 이다 (F010)", async () => {
    const { store: rec, asked } = ledger(19, 5);
    const view = await detail(store(insight()), portfolio(), market(), null, rec).execute("u1");
    const block = view.recommendation!;

    assert.deepEqual(asked, ["coach.buy"]);
    assert.equal(block.signalTrackRecord!.signalType, "coach.buy");
    assert.equal(block.signalTrackRecord!.sample, 19);
    assert.equal(block.signalTrackRecord!.lowSample, true);
    assert.equal(block.blockedReason, "insufficient_sample");
  });

  it("표본 20 이상 · 빗나간 사례가 있으면 렌더되고, 실패사례는 30일 뒤 채점된 것이다 (F010)", async () => {
    const { store: rec } = ledger(24, 6, 12);
    const view = await detail(store(insight()), portfolio(), market(), null, rec).execute("u1");
    const block = view.recommendation!;

    assert.equal(block.renderable, true);
    assert.equal(block.blockedReason, null);
    assert.equal(block.signalTrackRecord!.winRate, 18 / 24);
    assert.equal(block.signalTrackRecord!.alwaysUpRate, 0.5);
    assert.ok(Math.abs(block.signalTrackRecord!.excessWinRate! - 0.25) < 1e-9);
    assert.equal(block.failureCases.length, 3);
    assert.equal(block.failureCases[0].event, "coach.buy");
    assert.equal(block.failureCases[0].returnRate, -0.1);
  });

  it("표본은 충분한데 빗나간 것이 0이면 failure_cases_missing 이다", async () => {
    const { store: rec } = ledger(24, 0);
    const view = await detail(store(insight()), portfolio(), market(), null, rec).execute("u1");
    assert.equal(view.recommendation!.blockedReason, "failure_cases_missing");
  });

  it("staleHours 는 payload 생성 시각 기준 내림 정수다", async () => {
    const view = await detail(store(insight({ createdAt: new Date(0) }))).execute("u1");

    assert.equal(view.staleHours, 27);
    assert.equal(view.generatedAt, T0.toISOString());
    assert.equal(view.regime, "sideways");
  });

  it("행동 기록은 요청 때 센 판정의 코드 + 수치이고 읽지 못한 판정은 빠진다(FR-21)", async () => {
    const analyzer: BehaviorAnalyzer = {
      execute: async () => [
        finding({ kind: "unknown" }, 90),
        finding({ kind: "over_trading", windowHours: 24, trades: 15, threshold: 12 }),
      ],
    };

    const view = await detail(store(null), portfolio(), market(), analyzer).execute("u1");

    assert.deepEqual(view.behaviorFacts, [
      { factCode: "over_trading", params: { windowHours: 24, trades: 15, threshold: 12 }, amountKrw: null },
    ]);
  });

  it("행동 판정이 실패해도 상세는 나가고 행동 기록만 비다", async () => {
    const analyzer: BehaviorAnalyzer = {
      execute: async () => {
        throw new Error("market down");
      },
    };

    const view = await detail(store(null), portfolio([holding]), market(), analyzer).execute("u1");

    assert.deepEqual(view.behaviorFacts, []);
    assert.equal(view.exitPlans.length, 1);
  });

  it("응답에 목표가 · 확신 · 예측 필드가 없다", async () => {
    const view = await detail(store(insight()), portfolio([holding])).execute("u1");
    const body = JSON.stringify(view);

    for (const banned of ["targetPrice", "expectedReturn", "confidence", "probability"]) {
      assert.ok(!body.includes(banned), banned);
    }
  });
});
