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
import { ExplainCoachDecision, sentencesOf, type ExplainStreamEvent } from "../ExplainCoachDecision";

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

  const passing = () => store({ sample: 20, hits: 15, avgReturn: 0.02, worstReturn: -0.08 }, 3);
  const withLlm = (out: Partial<CoachExplanation>): CoachExplainer => ({
    explain: async () => ({ ...explanation, ...out }),
  });

  it("LLM 이 지어낸 숫자 · 명령형 지시는 걸러지고 그 칸은 템플릿이다 (FEATURE-008 FR-42 · 43)", async () => {
    const result = await new ExplainCoachDecision(
      withLlm({
        modeReasoning: "4주 뒤 145,000원까지 오를 가능성이 높습니다.",
        keyDrivers: ["심리가 공포 구간입니다.", "지금 분할 매수를 고려하세요."],
      }),
      market,
      noHolding,
      passing()
    ).execute("user-1", input);
    assert.ok(result.renderable);
    if (!result.renderable) return;
    assert.equal(result.source, "llm_checked");
    assert.equal(result.droppedSentences, 2);
    assert.ok(!result.modeReasoning.includes("145,000"));
    assert.deepEqual(result.keyDrivers, ["심리가 공포 구간입니다."]);
  });

  it("LLM 이 실패해도 해설이 비지 않는다 — 전부 템플릿", async () => {
    const failing: CoachExplainer = { explain: async () => { throw new Error("Gemini 503"); } };
    const result = await new ExplainCoachDecision(failing, market, noHolding, passing()).execute("user-1", input);
    assert.ok(result.renderable);
    if (!result.renderable) return;
    assert.equal(result.source, "template");
    assert.ok(result.modeReasoning.length > 0 && result.keyDrivers.length > 0);
  });

  it("화면이 떠나 중단된 호출은 템플릿으로 덮지 않고 그대로 끝낸다", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted: CoachExplainer = { explain: async () => { throw new Error("aborted"); } };
    await assert.rejects(() =>
      new ExplainCoachDecision(aborted, market, noHolding, passing()).execute("user-1", input, controller.signal)
    );
  });

  describe("stream (FEATURE-008 FR-47 · FR-60 · FR-61)", () => {
    const collect = async (explainer: CoachExplainer, judgments = passing(), signal?: AbortSignal) => {
      const events: ExplainStreamEvent[] = [];
      await new ExplainCoachDecision(explainer, market, noHolding, judgments).stream(
        "user-1",
        { ...input, news: [{ title: "현물 ETF 순유입", source: "코인뉴스" }] },
        (e) => events.push(e),
        signal
      );
      return events;
    };
    const names = (events: ExplainStreamEvent[]) =>
      events.map((e) => (e.event === "message.step" ? `step:${e.data.step}:${e.data.status}` : e.event));

    it("템플릿을 먼저 흘리고, 검증을 통과한 LLM 문장으로 바꾼다 — 단계는 실제 순서", async () => {
      const events = await collect(withLlm({ modeReasoning: "심리가 공포 구간이라 장기 관점이 맞습니다." }));
      const order = names(events);
      assert.deepEqual(order.slice(0, 4), ["message.start", "step:judgment:active", "step:judgment:done", "message.card"]);
      const firstDelta = order.indexOf("message.delta");
      const replace = order.indexOf("message.replace");
      assert.ok(firstDelta > order.indexOf("step:draft:active") && firstDelta < replace);
      assert.ok(order.indexOf("step:verify:done") < replace);
      assert.equal(order.at(-1), "message.done");

      const card = events.find((e) => e.event === "message.card");
      assert.ok(card?.event === "message.card");
      assert.equal(card.data.trackRecord.sample, 20);
      assert.equal(card.data.failureCases.length, 3);
      assert.deepEqual(card.data.citations, [{ title: "현물 ETF 순유입", source: "코인뉴스" }]);

      const done = events.at(-1);
      assert.ok(done?.event === "message.done" && done.data.source === "llm");
    });

    it("LLM 원문은 흐르지 않는다 — 걸린 문장은 replace 에도 없다", async () => {
      const bad = "4주 뒤 145,000원까지 오를 가능성이 높습니다.";
      const events = await collect(withLlm({ modeReasoning: bad }));
      const text = JSON.stringify(events.filter((e) => e.event === "message.delta" || e.event === "message.replace"));
      assert.ok(!text.includes("145,000"));
    });

    it("LLM 이 실패하면 다듬기 · 검사를 건너뛰고, 흘린 템플릿이 최종이다", async () => {
      const failing: CoachExplainer = { explain: async () => { throw new Error("Gemini 503"); } };
      const events = await collect(failing);
      const order = names(events);
      assert.ok(order.includes("step:polish:skipped") && order.includes("step:verify:skipped"));
      assert.ok(!order.includes("message.replace"));
      const done = events.at(-1);
      assert.ok(done?.event === "message.done" && done.data.source === "template");
      assert.ok(order.filter((n) => n === "message.delta").length > 0);
    });

    it("게이트가 닫히면 blocked 로 끝나고 LLM 을 부르지 않는다", async () => {
      const { explainer, calls } = spyExplainer();
      const events = await collect(explainer, store({ sample: 3, hits: 2, avgReturn: 0.01, worstReturn: -0.05 }, 1));
      assert.equal(names(events).at(-1), "message.blocked");
      assert.equal(calls.length, 0);
    });

    it("끊기면 더 내지 않는다", async () => {
      const controller = new AbortController();
      const slow: CoachExplainer = {
        explain: () => new Promise((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("aborted")))),
      };
      const pending = collect(slow, passing(), controller.signal);
      setTimeout(() => controller.abort(), 10);
      const events = await pending;
      assert.ok(!names(events).includes("message.done"));
    });
  });

  it("문장 자르기는 소수점에서 자르지 않는다", () => {
    assert.deepEqual(sentencesOf("24시간 변동 +1.23% 입니다. 거래대금 약 5억 원 기준입니다."), [
      "24시간 변동 +1.23% 입니다. ",
      "거래대금 약 5억 원 기준입니다.",
    ]);
  });
});
