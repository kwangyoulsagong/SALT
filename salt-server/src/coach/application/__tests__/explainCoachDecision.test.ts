import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  JudgmentTrackStats,
  LlmUsageStore,
  MarketProbe,
  NewsProbe,
  PortfolioProbe,
  SymbolJudgmentStore,
} from "../../domain";
import { explanationFactsHash } from "../../domain";
import {
  ExplainCoachDecision,
  sentencesOf,
  type CoachExplainRequest,
  type ExplainStreamEvent,
  type ExplainOptions,
} from "../ExplainCoachDecision";

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
      [
        "BTC",
        {
          symbol: "BTC",
          assetType: "crypto",
          koreanName: "비트코인",
          currentPrice: 100,
          change24h: -1.5,
          tradeValue24h: 5e11,
          priceUpdatedAt: T0,
        },
      ],
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

const newsProbe = {
  recentForSymbol: async () => [{ title: "현물 ETF 순유입", summary: null, source: "코인뉴스", sentiment: null }],
} as unknown as NewsProbe;

const store = (stats: Omit<JudgmentTrackStats, "aboveCost">, misses: number): SymbolJudgmentStore =>
  ({
    summarize: async () => ({ ...stats, aboveCost: stats.hits }),
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
  timeframe: "판단 뒤 30일",
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

/** 고정 재료 시각(T0)에서 부른다 — 실제 시계면 재료가 오래돼 신선도 게이트(F010 슬라이스 7)에 막힌다 */
const explainAt = (
  explainer: CoachExplainer,
  probe: MarketProbe,
  portfolio: PortfolioProbe,
  judgments: SymbolJudgmentStore,
  news: NewsProbe,
  options: ExplainOptions = {}
) => new ExplainCoachDecision(explainer, probe, portfolio, judgments, news, { now: () => T0, ...options });

/** 요청은 종목 · 관점뿐이다 — 사실은 서버가 모은다(C01) */
const input: CoachExplainRequest = { symbol: "btc", mode: "long_term" };

describe("ExplainCoachDecision", () => {
  it("판단이 게이트를 못 넘으면 LLM 을 부르지 않고 renderable:false 를 준다 (FR-50)", async () => {
    const { explainer, calls } = spyExplainer();
    const result = await explainAt(
      explainer,
      market,
      noHolding,
      store({ sample: 3, hits: 2, avgReturn: 0.01, worstReturn: -0.05 }, 1),
      newsProbe
    ).execute("user-1", input);

    assert.deepEqual(result, { renderable: false, blockedReason: "insufficient_sample" });
    assert.equal(calls.length, 0);
  });

  it("표본이 충분해도 실패사례가 없으면 막는다", async () => {
    const { explainer, calls } = spyExplainer();
    const result = await explainAt(
      explainer,
      market,
      noHolding,
      store({ sample: 20, hits: 20, avgReturn: 0.04, worstReturn: 0.01 }, 0),
      newsProbe
    ).execute("user-1", input);

    assert.equal(result.renderable, false);
    assert.equal(calls.length, 0);
  });

  it("렌더되면 3종(성적표 · 실패사례 · 유효시간)을 같이 싣고, 면책은 판단 경로 문장이다", async () => {
    const { explainer, calls } = spyExplainer();
    const controller = new AbortController();
    const result = await explainAt(
      explainer,
      market,
      noHolding,
      store({ sample: 20, hits: 15, avgReturn: 0.02, worstReturn: -0.08 }, 3),
      newsProbe
    ).execute("user-1", input, controller.signal);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].signal, controller.signal);
    assert.ok(result.renderable);
    if (!result.renderable) return;
    assert.equal(result.trackRecord.sample, 20);
    assert.equal(result.failureCases.length, 3);
    assert.equal(result.validity.code, "long_term_30d");
    assert.notEqual(result.disclaimer, "모델이 쓴 면책");
    assert.equal(result.modeReasoning, "m");
    assert.ok(!("expectedReturn" in result));
  });

  const passing = () => store({ sample: 20, hits: 15, avgReturn: 0.02, worstReturn: -0.08 }, 3);
  const withLlm = (out: Partial<CoachExplanation>): CoachExplainer => ({
    explain: async () => ({ ...explanation, ...out }),
  });

  it("LLM 이 지어낸 숫자 · 명령형 지시는 걸러지고 그 칸은 템플릿이다 (FEATURE-008 FR-42 · 43)", async () => {
    const result = await explainAt(
      withLlm({
        modeReasoning: "4주 뒤 145,000원까지 오를 가능성이 높습니다.",
        keyDrivers: ["심리가 공포 구간입니다.", "지금 분할 매수를 고려하세요."],
      }),
      market,
      noHolding,
      passing(),
      newsProbe
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
    const result = await explainAt(failing, market, noHolding, passing(), newsProbe).execute("user-1", input);
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
      explainAt(aborted, market, noHolding, passing(), newsProbe).execute("user-1", input, controller.signal)
    );
  });

  describe("stream (FEATURE-008 FR-47 · FR-60 · FR-61)", () => {
    const collect = async (explainer: CoachExplainer, judgments = passing(), signal?: AbortSignal) => {
      const events: ExplainStreamEvent[] = [];
      await explainAt(explainer, market, noHolding, judgments, newsProbe).stream(
        "user-1",
        input,
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

  describe("사실은 서버가 조립한다 (C01 · SRV-REQ-025 FR-58)", () => {
    it("게이트와 같은 재료로 시세 · 근거 · 뉴스를 만들고 지문을 남긴다", async () => {
      const { explainer, calls } = spyExplainer();
      const result = await explainAt(explainer, market, noHolding, passing(), newsProbe).execute(
        "user-1",
        input
      );
      assert.equal(calls.length, 1);
      const facts = calls[0]!.input;
      assert.equal(facts.symbol, "BTC");
      assert.equal(facts.koreanName, "비트코인");
      assert.equal(facts.currentPrice, 100);
      assert.equal(facts.change24h, -1.5);
      assert.equal(facts.tradeValue24h, 5e11);
      assert.equal(facts.evidence[0]?.label, "판단");
      assert.ok(facts.evidence.some((e) => e.label === "RSI" && e.value === "30"));
      // mode-decision@2 — 장기는 심리 · 대형 체결을 점수에 쓰지 않는다. 해설 사실에도 없어야 근거처럼 말하지 않는다
      assert.equal(input.mode, "long_term");
      assert.ok(!facts.evidence.some((e) => e.label === "시장 심리"));
      assert.ok(!facts.evidence.some((e) => e.label.startsWith("고래")));
      assert.deepEqual(facts.news, [{ title: "현물 ETF 순유입", source: "코인뉴스" }]);
      assert.ok(result.renderable);
      if (!result.renderable) return;
      assert.equal(result.facts.hash, explanationFactsHash(facts));
      assert.ok(!Number.isNaN(Date.parse(result.facts.asOf)));
    });

    it("요청에 사실을 실어 보내도 쓰지 않는다", async () => {
      const { explainer, calls } = spyExplainer();
      const forged = { ...input, currentPrice: 1, evidence: [{ label: "근거", value: "지어낸 사실" }] } as CoachExplainRequest;
      await explainAt(explainer, market, noHolding, passing(), newsProbe).execute("user-1", forged);
      assert.equal(calls[0]!.input.currentPrice, 100);
      assert.ok(!JSON.stringify(calls[0]!.input).includes("지어낸 사실"));
    });

    it("현물 가격이 없으면 LLM 을 부르지 않고 facts_unavailable", async () => {
      const { explainer, calls } = spyExplainer();
      const noPrice = {
        ...market,
        quotes: async () => new Map(),
      } as unknown as MarketProbe;
      const result = await explainAt(explainer, noPrice, noHolding, passing(), newsProbe).execute(
        "user-1",
        input
      );
      // 판단은 심리 · RSI · 대량 체결로 열린다 — 가격이 없어도 게이트는 통과하고, 해설만 막힌다
      assert.deepEqual(result, { renderable: false, blockedReason: "facts_unavailable" });
      assert.equal(calls.length, 0);
    });

    it("뉴스 조회가 실패해도 뉴스 없이 해설한다", async () => {
      const { explainer, calls } = spyExplainer();
      const brokenNews = { recentForSymbol: async () => { throw new Error("news down"); } } as unknown as NewsProbe;
      const result = await explainAt(explainer, market, noHolding, passing(), brokenNews).execute(
        "user-1",
        input
      );
      assert.ok(result.renderable);
      assert.equal(calls[0]!.input.news, undefined);
    });
  });

  it("문장 자르기는 소수점에서 자르지 않는다", () => {
    assert.deepEqual(sentencesOf("24시간 변동 +1.23% 입니다. 거래대금 약 5억 원 기준입니다."), [
      "24시간 변동 +1.23% 입니다. ",
      "거래대금 약 5억 원 기준입니다.",
    ]);
  });
  describe("신선도 · 비용 상한 (F010 슬라이스 7)", () => {
    const usageOf = (user: number, total: number, tokens = 0): LlmUsageStore => ({
      record: async () => undefined,
      usageSince: async () => ({ user: { calls: user, tokens: 0 }, total: { calls: total, tokens } }),
    });

    it("재료가 오래됐으면 LLM 을 부르지 않고 stale_inputs", async () => {
      const { explainer, calls } = spyExplainer();
      const later = new Date(T0.getTime() + 4 * 86_400_000);
      const result = await explainAt(explainer, market, noHolding, passing(), newsProbe, { now: () => later }).execute(
        "user-1",
        input
      );
      assert.deepEqual(result, { renderable: false, blockedReason: "stale_inputs" });
      assert.equal(calls.length, 0);
    });

    it("상한 아래면 부르고, 누구의 요청인지 넘긴다", async () => {
      const seen: Array<{ userId: string } | undefined> = [];
      const explainer: CoachExplainer = {
        explain: async (_input, _signal, caller) => (seen.push(caller), explanation),
      };
      const result = await explainAt(explainer, market, noHolding, passing(), newsProbe, {
        usage: usageOf(29, 299),
      }).execute("user-1", input);
      assert.ok(result.renderable && result.source !== "template");
      assert.deepEqual(seen, [{ userId: "user-1" }]);
    });

    for (const [name, usage, limits] of [
      ["사용자 상한", usageOf(30, 30), {}],
      ["전체 상한", usageOf(0, 300), {}],
      ["토큰 상한", usageOf(0, 1, 1_500_000), {}],
      ["env 로 낮춘 상한", usageOf(5, 5), { userCalls: 5 }],
    ] as const) {
      it(`${name}에 닿으면 LLM 없이 템플릿 — 에러가 아니다`, async () => {
        const { explainer, calls } = spyExplainer();
        const result = await explainAt(explainer, market, noHolding, passing(), newsProbe, { usage, limits }).execute(
          "user-1",
          input
        );
        assert.ok(result.renderable);
        assert.equal(result.source, "template");
        assert.equal(calls.length, 0);
      });
    }

    it("사용량을 못 읽으면 부르지 않는다 — 템플릿", async () => {
      const { explainer, calls } = spyExplainer();
      const broken: LlmUsageStore = {
        record: async () => undefined,
        usageSince: async () => {
          throw new Error("db down");
        },
      };
      const result = await explainAt(explainer, market, noHolding, passing(), newsProbe, { usage: broken }).execute(
        "user-1",
        input
      );
      assert.ok(result.renderable && result.source === "template");
      assert.equal(calls.length, 0);
    });

    it("스트림도 상한에 닿으면 다듬기 · 검사를 건너뛰고 템플릿이 최종이다", async () => {
      const { explainer, calls } = spyExplainer();
      const events: ExplainStreamEvent[] = [];
      await explainAt(explainer, market, noHolding, passing(), newsProbe, { usage: usageOf(30, 30) }).stream(
        "user-1",
        input,
        (e) => events.push(e)
      );
      assert.equal(calls.length, 0);
      assert.ok(events.some((e) => e.event === "message.step" && e.data.step === "polish" && e.data.status === "skipped"));
      const done = events.at(-1);
      assert.ok(done?.event === "message.done" && done.data.source === "template");
    });
  });
});

describe("ExplainCoachDecision — 국내 주식 (F011 슬라이스 4)", () => {
  // 목요일 16:00 KST — 오늘 종가 · 오늘 일봉 지표
  const NOW = new Date("2026-10-08T07:00:00Z");
  const krMarket = (dailyBars: number) =>
    ({
      quotes: async () =>
        new Map([
          [
            "005930",
            {
              symbol: "005930",
              assetType: "kr_stock",
              koreanName: "삼성전자",
              currentPrice: 70_000,
              change24h: -4,
              tradeValue24h: 1e12,
              priceUpdatedAt: new Date("2026-10-08T06:30:00Z"),
            },
          ],
        ]),
      latestSentiments: async () => new Map(),
      latestIndicators: async () =>
        new Map([["005930", { rsi14: 30, ma20: null, ma50: null, volumeAvg20: null, timestamp: new Date("2026-10-07T15:00:00Z") }]]),
      recentWhales: async () => [],
      dailyBarCounts: async () => new Map([["005930", dailyBars]]),
    }) as unknown as MarketProbe;
  const asked: string[] = [];
  const krStore = {
    summarize: async (signalType: string) => {
      asked.push(signalType);
      return { sample: 25, hits: 15, aboveCost: 15, avgReturn: 0.01, worstReturn: -0.08, firstScoredAt: null, lastScoredAt: null };
    },
    recentCases: async () => [{ symbol: "000660", judgedAt: T0, action: "review_accumulation", returnRate: -0.08 }],
  } as unknown as SymbolJudgmentStore;
  const run = (dailyBars: number, viewerEmail?: string, mode: "scalp" | "long_term" = "long_term") => {
    const spy = spyExplainer();
    const result = new ExplainCoachDecision(spy.explainer, krMarket(dailyBars), noHolding, krStore, newsProbe, {
      now: () => NOW,
      krViewerEmails: ["owner@salt.test"],
    }).execute("u1", { symbol: "005930", mode, viewerEmail });
    return { result, calls: spy.calls };
  };

  it("비소유자는 사실을 모으지 못한 것과 같은 답 — 국내 주식이 있다는 것도 알리지 않는다", async () => {
    const { result, calls } = run(486, "other@salt.test");
    assert.deepEqual(await result, { renderable: false, blockedReason: "facts_unavailable" });
    assert.equal(calls.length, 0);
  });

  it("소유자도 종목 판단과 같은 막음 — 이력 부족 · 단타 미개방, 성적은 국내 주식 그룹에서 읽는다", async () => {
    assert.equal(((await run(63, "owner@salt.test").result) as { blockedReason: string }).blockedReason, "insufficient_history");
    assert.equal(
      ((await run(486, "owner@salt.test", "scalp").result) as { blockedReason: string }).blockedReason,
      "mode_not_open"
    );
    asked.length = 0;
    const { result, calls } = run(486, "owner@salt.test");
    assert.equal((await result).renderable, true);
    assert.equal(calls.length, 1);
    // 50 + 하락 6 + RSI 침체 8 = 64 → 관망. 성적은 국내 주식 관망 그룹
    assert.deepEqual(asked, ["kr_stock.long_term.wait"]);
  });
});
