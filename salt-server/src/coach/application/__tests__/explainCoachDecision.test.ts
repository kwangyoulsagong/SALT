import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  JudgmentTrackStats,
  MarketProbe,
  PortfolioProbe,
  SymbolJudgmentStore,
} from "../../domain";
import { ExplainCoachDecision } from "../ExplainCoachDecision";

/**
 * 즉석 해설 게이트 (`SRV-REQ-025` FR-50 · FR-51).
 *
 * 재료는 장기 "모아가기 검토"가 근거를 갖고 나오는 조합이다(공포 심리 · RSI 침체 · 대량 매수).
 * 게이트를 가르는 것은 저장소의 표본 · 실패사례다.
 */
const T0 = new Date("2026-09-01T00:00:00Z");

const market = {
  quotes: async () =>
    new Map([
      ["BTC", { symbol: "BTC", assetType: "crypto", currentPrice: 100, change24h: 0, priceUpdatedAt: T0 }],
    ]),
  latestSentiments: async () =>
    new Map([
      ["BTC", { sentimentScore: 30, sentimentLabel: "fear", priceChange24h: 0, calculatedAt: T0 }],
    ]),
  latestIndicators: async () =>
    new Map([["BTC", { rsi14: 30, ma20: null, ma50: null, volumeAvg20: null, timestamp: T0 }]]),
  recentWhales: async () => [{ transactionType: "buy", amountKRW: 1000 }],
} as unknown as MarketProbe;

const noHolding = { getHolding: async () => null } as unknown as PortfolioProbe;

const store = (stats: JudgmentTrackStats, misses: number): SymbolJudgmentStore =>
  ({
    summarize: async () => stats,
    recentCases: async () =>
      Array.from({ length: misses }, (_, i) => ({
        symbol: "ETH",
        judgedAt: new Date(T0.getTime() - (i + 1) * 86_400_000),
        action: "review_accumulation",
        returnRate: -0.08,
      })),
  }) as unknown as SymbolJudgmentStore;

const explanation: CoachExplanation = {
  modeReasoning: "m",
  timeframe: "약 30일 내외",
  keyDrivers: ["k"],
  risks: ["r"],
  newsSummary: [],
  disclaimer: "모델이 쓴 면책",
  generatedAt: T0.toISOString(),
  cached: false,
};

const spyExplainer = () => {
  const calls: Array<{ input: CoachExplanationInput; signal?: AbortSignal }> = [];
  const explainer: CoachExplainer = {
    explain: async (input, signal) => {
      calls.push({ input, signal });
      return explanation;
    },
  };
  return { explainer, calls };
};

const input: CoachExplanationInput = {
  symbol: "btc",
  koreanName: "비트코인",
  mode: "long_term",
  currentPrice: 100,
  change24h: 0,
  tradeValue24h: 1,
  evidence: [{ label: "심리", value: "공포" }],
};

describe("ExplainCoachDecision", () => {
  it("판단이 게이트를 못 넘으면 LLM 을 부르지 않고 renderable:false 를 준다 (FR-50)", async () => {
    const { explainer, calls } = spyExplainer();
    const result = await new ExplainCoachDecision(
      explainer,
      market,
      noHolding,
      store({ sample: 3, hits: 2, avgReturn: 0.01, worstReturn: -0.05 }, 1)
    ).execute("user-1", input);

    assert.deepEqual(result, { renderable: false, blockedReason: "insufficient_sample" });
    assert.equal(calls.length, 0);
  });

  it("표본이 충분해도 실패사례가 없으면 막는다", async () => {
    const { explainer, calls } = spyExplainer();
    const result = await new ExplainCoachDecision(
      explainer,
      market,
      noHolding,
      store({ sample: 20, hits: 20, avgReturn: 0.04, worstReturn: 0.01 }, 0)
    ).execute("user-1", input);

    assert.equal(result.renderable, false);
    assert.equal(calls.length, 0);
  });

  it("렌더되면 3종(성적표 · 실패사례 · 유효시간)을 같이 싣고, 면책은 판단 경로 문장이다", async () => {
    const { explainer, calls } = spyExplainer();
    const controller = new AbortController();
    const result = await new ExplainCoachDecision(
      explainer,
      market,
      noHolding,
      store({ sample: 20, hits: 15, avgReturn: 0.02, worstReturn: -0.08 }, 3)
    ).execute("user-1", input, controller.signal);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].signal, controller.signal);
    assert.ok(result.renderable);
    if (!result.renderable) return;
    assert.equal(result.trackRecord.sample, 20);
    assert.equal(result.failureCases.length, 3);
    assert.equal(result.validity.code, "long_term_1w_1y");
    assert.notEqual(result.disclaimer, "모델이 쓴 면책");
    assert.equal(result.modeReasoning, "m");
    assert.ok(!("expectedReturn" in result));
  });
});
