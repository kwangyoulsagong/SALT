import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  rankCandidates,
  scoreCandidate,
  type CoachContext,
  type CoachHolding,
  type CoachInsight,
  type NewsAnalysisResult,
  type SymbolFeature,
} from "../index";

/**
 * 점수 엔진 **특성화 테스트**.
 *
 * 옳은 점수를 정의하는 것이 아니라 **이관 전 산술을 숫자로 못 박는다**
 * (`SRV-REQ-006` NFR 정정 — DB 가 비어 있어 응답 스냅샷이 성립하지 않는다).
 *
 * 기대값은 전부 원문 `ai-coach-score.engine.ts` 의 식을 손으로 푼 값이다.
 * 여기 숫자가 바뀌면 추천 순위가 바뀐 것이고, **바뀌어야 하는 경우에도 한 번 걸린다.**
 */

const holding = (overrides: Partial<CoachHolding> = {}): CoachHolding => ({
  symbol: "BTC",
  totalQuantity: 1,
  averageBuyPrice: 100,
  totalInvested: 100,
  currentPrice: 100,
  currentValue: 100,
  unrealizedProfit: 0,
  unrealizedProfitRate: 0,
  realizedProfit: 0,
  ...overrides,
});

const insight = (overrides: Partial<CoachInsight> = {}): CoachInsight => ({
  id: "i1",
  type: "behavior_analysis",
  symbol: null,
  dedupeKey: null,
  title: "t",
  summary: "s",
  severity: 50,
  confidence: null,
  payload: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  expiresAt: null,
  ...overrides,
});

const feature = (overrides: Partial<SymbolFeature> = {}): SymbolFeature => ({
  symbol: "BTC",
  riskInsights: [],
  ...overrides,
});

const context = (
  features: SymbolFeature[],
  overrides: Partial<CoachContext> = {}
): CoachContext => ({
  userId: "u1",
  marketRegime: "sideways",
  portfolioState: {
    totalValue: 1000,
    concentration: 0.1,
    riskLevel: "low",
    diversificationScore: 90,
  },
  maxWeight: 0.6,
  holdings: [],
  symbolFeatures: new Map(features.map((f) => [f.symbol, f])),
  behaviorInsights: [],
  candidateSymbols: features.map((f) => f.symbol),
  newsAnalysisMap: new Map(),
  ...overrides,
});

const buy = (ctx: CoachContext) => scoreCandidate(ctx, { action: "buy", symbol: "BTC" });

describe("scoreCandidate — buy 특성화", () => {
  it("신호가 하나도 없으면 기본 20점이고 요인이 비어 있다", () => {
    const scored = buy(context([feature()]));

    assert.equal(scored.score, 20);
    assert.deepEqual(scored.positiveFactors, []);
    assert.deepEqual(scored.negativeFactors, []);
  });

  it("종목 재료가 아예 없으면 0점이다", () => {
    const scored = scoreCandidate(context([]), { action: "buy", symbol: "ETH" });

    assert.equal(scored.score, 0);
    assert.deepEqual(scored.positiveFactors, []);
  });

  it("RSI 20 은 과매도로 +15 (상한 20)", () => {
    const scored = buy(
      context([
        feature({
          indicator: {
            rsi14: 20,
            ma20: null,
            ma50: null,
            volumeAvg20: null,
            timestamp: new Date(),
          },
        }),
      ])
    );

    // min(20, round((30 - 20) * 1.5)) = 15
    assert.equal(scored.score, 35);
    assert.deepEqual(scored.positiveFactors, [
      { key: "rsi_oversold", score: 15, message: "RSI 20.0 과매도" },
    ]);
  });

  it("RSI 75 는 과열로 -15", () => {
    const scored = buy(
      context([
        feature({
          indicator: {
            rsi14: 75,
            ma20: null,
            ma50: null,
            volumeAvg20: null,
            timestamp: new Date(),
          },
        }),
      ])
    );

    // min(18, round((75 - 65) * 1.5)) = 15
    assert.equal(scored.score, 5);
    assert.equal(scored.negativeFactors[0]?.key, "rsi_hot");
    assert.equal(scored.negativeFactors[0]?.score, -15);
  });

  it("MA20 대비 10% 하단이면 +10 (상한 12)", () => {
    const scored = buy(
      context([
        feature({
          currentPrice: 90,
          indicator: {
            rsi14: null,
            ma20: 100,
            ma50: null,
            volumeAvg20: null,
            timestamp: new Date(),
          },
        }),
      ])
    );

    assert.equal(scored.score, 30);
    assert.equal(scored.positiveFactors[0]?.message, "MA20 대비 10.0% 하단");
  });

  it("고래 순매수 30억은 +3 — 금액이 계단식이다", () => {
    const scored = buy(
      context([feature({ whaleFlow: { buy: 3_000_000_000, sell: 0 } })])
    );

    assert.equal(scored.score, 23);
    assert.equal(scored.positiveFactors[0]?.key, "whale_buy");
  });

  it("고래 순매수 600억은 상한 15 에서 멈춘다", () => {
    const scored = buy(
      context([feature({ whaleFlow: { buy: 60_000_000_000, sell: 0 } })])
    );

    assert.equal(scored.score, 35);
  });

  it("공포 구간은 +8, 과열 구간은 -12", () => {
    const panic = buy(context([feature()], { marketRegime: "panic" }));
    const euphoric = buy(context([feature()], { marketRegime: "euphoric" }));

    assert.equal(panic.score, 28);
    assert.equal(euphoric.score, 8);
  });

  it("비중이 한도의 90% 를 넘으면 -20 이고, 점수는 0 아래로 내려가지 않는다", () => {
    const scored = buy(
      context([feature({ holding: holding({ currentValue: 600 }) })])
    );

    // 20 - 20 = 0
    assert.equal(scored.score, 0);
    assert.equal(scored.negativeFactors[0]?.key, "position_limit");
  });

  it("행동 인사이트 severity 85 는 -12 를 매긴다", () => {
    const scored = buy(
      context([feature()], { behaviorInsights: [insight({ severity: 85 })] })
    );

    assert.equal(scored.score, 8);
    assert.equal(scored.negativeFactors[0]?.score, -12);
  });

  it("뉴스가 bullish 80점이면 +10 이고 메시지는 뉴스 요약 그대로다", () => {
    const news: NewsAnalysisResult = {
      symbol: "BTC",
      score: 80,
      sentiment: "bullish",
      keywords: ["ETF"],
      articleCount: 3,
      summary: "ETF 관련 긍정적 뉴스 감지",
    };

    const scored = buy(
      context([feature()], { newsAnalysisMap: new Map([["BTC", news]]) })
    );

    assert.equal(scored.score, 30);
    assert.equal(scored.positiveFactors[0]?.message, news.summary);
  });

  it("매수 구간 신호는 severity/5 만큼(상한 18) 더한다", () => {
    const scored = buy(
      context([
        feature({
          buyZoneInsight: insight({ type: "smart_buy_zone", severity: 60 }),
        }),
      ])
    );

    // min(18, round(60 / 5)) = 12
    assert.equal(scored.score, 32);
    assert.equal(scored.positiveFactors[0]?.key, "buy_zone");
  });
});

describe("scoreCandidate — sell · hold · rebalance 특성화", () => {
  const sell = (ctx: CoachContext) =>
    scoreCandidate(ctx, { action: "sell", symbol: "BTC" });

  it("RSI 80 과열 + 평가수익 20% 는 20 + 15 + 18 = 53", () => {
    const scored = sell(
      context([
        feature({
          holding: holding({ unrealizedProfitRate: 0.2 }),
          indicator: {
            rsi14: 80,
            ma20: null,
            ma50: null,
            volumeAvg20: null,
            timestamp: new Date(),
          },
        }),
      ])
    );

    assert.equal(scored.score, 53);
  });

  it("공포 구간 + 고래 매수 중의 손실 매도는 -10 으로 억제한다", () => {
    const scored = sell(
      context(
        [
          feature({
            holding: holding({ unrealizedProfitRate: -0.1 }),
            whaleFlow: { buy: 2_000_000_000, sell: 0 },
          }),
        ],
        { marketRegime: "panic" }
      )
    );

    // 20 - 10 = 10
    assert.equal(scored.score, 10);
    assert.equal(scored.negativeFactors[0]?.key, "premature_sell");
  });

  it("최대 보유 종목이 한도를 넘으면 축소 요인 +14 가 붙는다", () => {
    const scored = sell(
      context([feature({ holding: holding({ currentValue: 700 }) })], {
        portfolioState: {
          totalValue: 1000,
          concentration: 0.7,
          largestAsset: "BTC",
          riskLevel: "medium",
          diversificationScore: 30,
        },
      })
    );

    assert.equal(scored.score, 34);
    assert.equal(
      scored.positiveFactors.some((f) => f.key === "concentration_relief"),
      true
    );
  });

  it("hold 는 35 에서 시작하고 관망 시장·중립 고래가 각각 +8 · +5", () => {
    const scored = scoreCandidate(context([feature()]), {
      action: "hold",
      symbol: "BTC",
    });

    assert.equal(scored.score, 48);
  });

  it("rebalance 는 집중도 high 에 +20, 한도 초과 비중에 +18", () => {
    const scored = scoreCandidate(
      context([feature({ holding: holding({ currentValue: 800 }) })], {
        portfolioState: {
          totalValue: 1000,
          concentration: 0.8,
          largestAsset: "BTC",
          riskLevel: "high",
          diversificationScore: 20,
        },
      }),
      { action: "rebalance", symbol: "BTC" }
    );

    assert.equal(scored.score, 58);
  });
});

describe("rankCandidates", () => {
  it("점수 내림차순으로 정렬한다", () => {
    const ctx = context([feature()]);

    const ranked = rankCandidates(ctx, [
      { action: "buy", symbol: "BTC" },
      { action: "hold", symbol: "BTC" },
    ]);

    assert.deepEqual(
      ranked.map((r) => [r.action, r.score]),
      [
        ["hold", 48],
        ["buy", 20],
      ]
    );
  });
});
