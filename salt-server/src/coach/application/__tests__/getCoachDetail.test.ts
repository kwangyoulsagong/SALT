import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachHolding,
  CoachInsight,
  CoachInsightStore,
  MarketProbe,
  PortfolioProbe,
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
  history: CoachInsight[] = latest ? [latest] : [],
  behaviors: CoachInsight[] = []
): CoachInsightStore =>
  ({
    findLatestRecommendation: async () => latest,
    findRecommendationHistory: async () => history,
    findActiveBehavior: async () => behaviors,
  }) as unknown as CoachInsightStore;

const market = (entry = 100, latest = 110): MarketProbe =>
  ({
    quotes: async () =>
      new Map([["BTC", { symbol: "BTC", assetType: "crypto", currentPrice: latest, change24h: 0, priceUpdatedAt: T0 }]]),
    latestCloses: async (symbols: string[]) =>
      new Map(symbols.map((symbol) => [symbol, latest])),
    closeAtOrAfter: async () => entry,
  }) as unknown as MarketProbe;

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

const detail = (s: CoachInsightStore, p = portfolio(), m = market()) =>
  new GetCoachDetail(s, m, p, () => NOW);

describe("GetCoachDetail", () => {
  it("추천이 없으면 recommendation · staleHours 가 null 이고 나머지는 준다", async () => {
    const view = await detail(store(null), portfolio([holding])).execute("u1");

    assert.equal(view.recommendation, null);
    assert.equal(view.staleHours, null);
    assert.equal(view.generatedAt, null);
    assert.equal(view.exitPlans.length, 1);
    assert.deepEqual(view.excluded, [{ assetType: "kr_stock", reasonCode: "no_realtime_data" }]);
    assert.ok(view.disclaimer.length > 0);
  });

  it("실패사례 출처가 없어 추천은 failure_cases_missing 으로 막히고 200 모양 그대로다", async () => {
    const view = await detail(store(insight())).execute("u1");
    const rec = view.recommendation!;

    assert.equal(rec.renderable, false);
    assert.equal(rec.blockedReason, "failure_cases_missing");
    assert.deepEqual(rec.failureCases, []);
    assert.equal(rec.scoreNote, "점수는 확률이 아닙니다");
    assert.equal(rec.assetType, "crypto");
    assert.deepEqual(rec.explanation, { text: "규칙 문장", source: "rule" });
  });

  it("성적은 같은 행동(coach.<action>)의 저장 추천만 센다", async () => {
    const sell = insight({
      id: "i2",
      payload: { ...insight().payload, recommendation: { action: "sell", symbol: "BTC", score: 40 } },
    });
    const feedback = insight({ id: "i3", payload: { ...insight().payload, kind: "coach_feedback" } });

    const view = await detail(store(insight(), [insight(), sell, feedback])).execute("u1");
    const track = view.recommendation!.signalTrackRecord!;

    assert.equal(track.signalType, "coach.buy");
    assert.equal(track.sample, 1);
    assert.equal(track.winRate, 1);
    assert.equal(track.lowSample, true);
  });

  it("표본이 없으면 sample: 0 이고 signal_track_record_missing 이다", async () => {
    const view = await detail(store(insight()), portfolio(), market(0)).execute("u1");
    const rec = view.recommendation!;

    assert.equal(rec.signalTrackRecord!.sample, 0);
    assert.equal(rec.signalTrackRecord!.winRate, null);
    assert.equal(rec.blockedReason, "signal_track_record_missing");
  });

  it("staleHours 는 payload 생성 시각 기준 내림 정수다", async () => {
    const view = await detail(store(insight({ createdAt: new Date(0) }))).execute("u1");

    assert.equal(view.staleHours, 27);
    assert.equal(view.generatedAt, T0.toISOString());
    assert.equal(view.regime, "sideways");
  });

  it("행동 기록은 코드 + 수치이고 읽지 못한 판정은 빠진다", async () => {
    const behaviors = [
      insight({ type: "behavior_analysis", payload: { kind: "over_trading", windowHours: 24, trades: 15, threshold: 12 } }),
      insight({ type: "behavior_analysis", payload: { kind: "unknown" } }),
    ];

    const view = await detail(store(null, [], behaviors)).execute("u1");

    assert.deepEqual(view.behaviorFacts, [
      { factCode: "over_trading", params: { windowHours: 24, trades: 15, threshold: 12 }, amountKrw: null },
    ]);
  });

  it("응답에 목표가 · 확신 · 예측 필드가 없다", async () => {
    const view = await detail(store(insight()), portfolio([holding])).execute("u1");
    const body = JSON.stringify(view);

    for (const banned of ["targetPrice", "expectedReturn", "confidence", "probability"]) {
      assert.ok(!body.includes(banned), banned);
    }
  });
});
