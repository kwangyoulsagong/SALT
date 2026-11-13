import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachExplainer,
  CoachExplanation,
  ExplainCaller,
  ExplanationSnapshotRecord,
  ExplanationSnapshotStore,
  MarketProbe,
  NewsProbe,
  SymbolJudgmentStore,
  TrackedAssetProbe,
} from "../../domain";
import { EXPLANATION_BATCH_MAX_PER_RUN } from "../../domain";
import { GenerateExplanationSnapshots } from "../GenerateExplanationSnapshots";
import { GetSymbolExplanation, trustInput } from "../GetSymbolExplanation";
import { ExplanationDemand } from "../lib/explanationDemand";

/**
 * 해설 스냅샷 — 배치(쓰기)와 읽기(4단) (F017 v2 단계 3 · `SRV-REQ-053` FR-3).
 * 읽기 유스케이스는 `CoachExplainer` 를 받지 않는다 — 요청 경로 LLM 0 은 타입이 지킨다(받을 자리가 없다)
 */
const T0 = new Date("2026-09-01T00:00:00Z");

const quote = (symbol: string, price: number | null) => ({
  symbol,
  assetType: "crypto",
  koreanName: symbol === "BTC" ? "비트코인" : symbol,
  currentPrice: price,
  change24h: -1.5,
  tradeValue24h: 5e11,
  priceUpdatedAt: T0,
});

const marketWith = (prices: Record<string, number | null>) =>
  ({
    quotes: async (symbols: string[]) => new Map(symbols.map((s) => [s, quote(s, prices[s] ?? null)])),
    latestSentiments: async (symbols: string[]) =>
      new Map(symbols.map((s) => [s, { sentimentScore: 30, sentimentLabel: "fear", priceChange24h: 0, calculatedAt: T0 }])),
    dailyBarCounts: async (symbols: string[]) => new Map(symbols.map((s) => [s, 365])),
    latestIndicators: async (symbols: string[]) =>
      new Map(symbols.map((s) => [s, { rsi14: 48, ma20: null, ma50: null, volumeAvg20: null, timestamp: T0 }])),
    recentWhales: async () => [],
  }) as unknown as MarketProbe;

const news = {
  recentForSymbol: async () => [
    { title: "현물 ETF 순유입", summary: null, source: "코인뉴스", sentiment: null, url: "https://n.example/1", publishedAt: T0 },
  ],
} as unknown as NewsProbe;

const judgments = {
  summarize: async () => ({ sample: 30, hits: 15, aboveCost: 15, poolSample: 30, poolAboveCost: 15 }),
  recentCases: async () => [
    { symbol: "ETH", judgedAt: new Date(T0.getTime() - 86_400_000), action: "wait", returnRate: -0.05 },
  ],
} as unknown as SymbolJudgmentStore;

const memoryStore = () => {
  const rows: ExplanationSnapshotRecord[] = [];
  const store: ExplanationSnapshotStore = {
    find: async (symbol, mode, fingerprint) => {
      const mine = rows.filter((r) => r.symbol === symbol && r.mode === mode);
      return (
        mine.find((r) => r.fingerprint === fingerprint) ??
        [...mine].sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0] ??
        null
      );
    },
    save: async (r) => {
      if (rows.some((x) => x.symbol === r.symbol && x.mode === r.mode && x.fingerprint === r.fingerprint)) return false;
      rows.push(r);
      return true;
    },
    prune: async () => 0,
  };
  return { store, rows };
};

const llmText: CoachExplanation = {
  modeReasoning: "비트코인은 지금 지켜보는 구간이에요. 24시간 -1.5% 움직였어요.",
  timeframe: "",
  keyDrivers: ["RSI 48 로 침체와 과열 사이예요."],
  risks: ["심리가 공포 쪽이에요."],
  newsSummary: ["현물 ETF 순유입 소식이 있어요."],
  disclaimer: "",
  generatedAt: T0.toISOString(),
  cached: false,
  provider: "local_claude",
};

const spyExplainer = (result: () => CoachExplanation | Promise<CoachExplanation>) => {
  const calls: (ExplainCaller | undefined)[] = [];
  const explainer: CoachExplainer = {
    explain: async (_input, _signal, caller) => {
      calls.push(caller);
      return result();
    },
  };
  return { explainer, calls };
};

const setup = (opts: { prices?: Record<string, number | null>; tracked?: string[] } = {}) => {
  const { store, rows } = memoryStore();
  const demand = new ExplanationDemand();
  const deps = {
    market: marketWith(opts.prices ?? { BTC: 100, ETH: 10 }),
    news,
    judgments,
    backtestJudgments: null,
    store,
    demand,
    now: () => T0,
  };
  const tracked: TrackedAssetProbe = { listTrackedSymbols: async () => opts.tracked ?? ["BTC"] };
  const read = new GetSymbolExplanation(deps);
  const batch = (explainer: CoachExplainer, llmEnabled = true) =>
    new GenerateExplanationSnapshots({ ...deps, explainer, tracked, llmEnabled });
  return { read, batch, rows, demand };
};

describe("GetSymbolExplanation — 4단, 빈 칸 0", () => {
  it("저장본 없음 → 사실표 문장(AI 아님) · 문장마다 인용 · 본 종목을 배치에 알린다", async () => {
    const { read, demand } = setup();
    const view = await read.execute("btc", "scalp");
    assert.equal(view.tier, "template");
    assert.equal(view.aiGenerated, false);
    assert.equal(view.provider, null);
    assert.ok(view.sentences.length > 0);
    assert.ok(view.sentences.every((s) => s.citations.length > 0));
    assert.deepEqual(demand.recent(T0), [{ symbol: "BTC", mode: "scalp" }]);
  });

  it("현재가 없음 → 없음 단(판단 한 줄 · 근거)", async () => {
    const { read } = setup({ prices: { BTC: null } });
    const view = await read.execute("BTC", "scalp");
    assert.equal(view.tier, "none");
    assert.ok(view.sentences.length > 0);
    assert.ok(view.sentences.filter((s) => s.section !== "track" && s.section !== "miss").every((s) => s.citations[0]!.id === "judgment"));
  });

  it("배치가 만든 뒤 → 최신 AI(저장 시각 · 공급자), 다시 알리지 않는다", async () => {
    const { read, batch, demand } = setup();
    await batch(spyExplainer(() => llmText).explainer).execute();
    const view = await read.execute("BTC", "scalp");
    assert.equal(view.tier, "latest");
    assert.equal(view.aiGenerated, true);
    assert.equal(view.provider, "local_claude");
    assert.equal(view.generatedAt, T0.toISOString());
    assert.equal(demand.recent(T0).length, 0);
  });

  it("지문이 바뀌고 방향이 같으면 이전 AI", async () => {
    const { read, batch, rows } = setup();
    await batch(spyExplainer(() => llmText).explainer).execute();
    rows[0] = { ...rows[0]!, fingerprint: "older" };
    const view = await read.execute("BTC", "scalp");
    assert.equal(view.tier, "previous");
    assert.equal(view.aiGenerated, true);
  });
});

describe("얼마나 믿을까 · 틀렸던 때(F017 v4 순서 1c · SRV-REQ-053 FR-16) — 어느 단이든 늘 뒤에 · 판단 블록과 같은 값", () => {
  const trustOf = (sentences: { section: string; text: string; citations: { id: string }[] }[]) =>
    sentences.filter((s) => s.section === "track" || s.section === "miss");

  it("네 단 모두 맨 뒤가 성적 한 줄 + 틀렸던 때 — 같은 문장", async () => {
    const template = await setup().read.execute("BTC", "scalp");
    const none = await setup({ prices: { BTC: null } }).read.execute("BTC", "scalp");
    const ai = setup();
    await ai.batch(spyExplainer(() => llmText).explainer).execute();
    const latest = await ai.read.execute("BTC", "scalp");
    ai.rows[0] = { ...ai.rows[0]!, fingerprint: "older" };
    const previous = await ai.read.execute("BTC", "scalp");
    const want = trustOf(template.sentences);
    assert.deepEqual(want.map((s) => s.section), ["track", "miss"]);
    for (const v of [none, latest, previous]) {
      assert.deepEqual(trustOf(v.sentences), want, v.tier);
      // 맨 뒤에 붙는다 — LLM 칸 사이에 끼지 않는다
      assert.deepEqual(v.sentences.slice(-2), want, v.tier);
    }
  });

  it("숫자 = 판단 블록 값(같은 저장소 · 같은 함수) — 30번 중 15번 · 틀렸던 때 날짜 · 종목 · 등락", async () => {
    const view = await setup().read.execute("BTC", "scalp");
    const [track, miss] = trustOf(view.sentences);
    assert.equal(track!.text, "이 판단은 지금까지 30번 중 15번 맞았어요(50%, 판단 뒤 24시간 기준).");
    assert.deepEqual(track!.citations.map((c) => c.id), ["track"]);
    assert.equal(miss!.text, "2026-08-31 ETH도 같은 판단이었는데 24시간 뒤 −5.0% 내렸어요.");
    assert.equal(miss!.citations[0]!.id, "miss-1");
  });

  it("판단 블록 값 → 재료 그대로(적중 · 기준 대비 · 표본 · 출처 · 사례 이름 · 날짜 · 등락) — 고르거나 고치지 않는다", () => {
    const got = trustInput("long_term", {
      trackRecord: { winRate: 0.6, excessWinRate: 0.07, sample: 40, sampleOrigin: "backtest" } as never,
      failureCases: [{ date: "2026-10-08", symbol: "000150", name: "두산", logoUrl: null, event: "long_term.avoid", outcome: "miss", returnRate: -0.455 }],
    });
    assert.deepEqual(got, {
      mode: "long_term",
      track: { mode: "long_term", winRate: 0.6, excessWinRate: 0.07, sample: 40, origin: "backtest" },
      misses: [{ date: "2026-10-08", name: "두산", symbol: "000150", returnRate: -0.455 }],
    });
  });

  it("저장된 AI 문장에 성적 칸이 있어도(옛 저장본) 지금 값 한 벌만 — 두 번 나오지 않는다", async () => {
    const ai = setup();
    await ai.batch(spyExplainer(() => llmText).explainer).execute();
    ai.rows[0] = {
      ...ai.rows[0]!,
      sentences: [...ai.rows[0]!.sentences, { section: "track", text: "옛 성적 문장", citations: [{ id: "track", label: "x", at: null, url: null }] }],
    };
    const view = await ai.read.execute("BTC", "scalp");
    assert.equal(view.sentences.filter((s) => s.section === "track").length, 1);
    assert.ok(!view.sentences.some((s) => s.text === "옛 성적 문장"));
  });
});

describe("GenerateExplanationSnapshots — 지문이 바뀐 것만 · 실패는 저장 0", () => {
  it("추적 종목 × 두 모드를 배치 몫으로 만든다(사용자 null)", async () => {
    const { batch, rows } = setup();
    const spy = spyExplainer(() => llmText);
    const r = await batch(spy.explainer).execute();
    assert.equal(r.generated, 2);
    assert.equal(rows.length, 2);
    assert.ok(spy.calls.every((c) => c?.userId === null));
    assert.ok(rows.every((row) => row.sentences.every((s) => s.citations.length > 0)));
  });

  it("두 번째 회차 — 지문이 같으면 LLM 0", async () => {
    const { batch } = setup();
    const spy = spyExplainer(() => llmText);
    await batch(spy.explainer).execute();
    const again = await batch(spy.explainer).execute();
    assert.equal(spy.calls.length, 2);
    assert.equal(again.unchanged, 2);
    assert.equal(again.generated, 0);
  });

  it("LLM 실패 · 검사가 전부 버림 → 저장 0(이전 성공본 유지)", async () => {
    const { batch, rows } = setup();
    const failing = await batch(spyExplainer(() => Promise.reject(new Error("boom"))).explainer).execute();
    assert.equal(failing.failed, 2);
    const allBad: CoachExplanation = {
      ...llmText,
      modeReasoning: "반드시 오릅니다.",
      keyDrivers: ["지금 사세요."],
      risks: ["99% 확실해요."],
      newsSummary: ["777% 급등 확정."],
    };
    const dropped = await batch(spyExplainer(() => allBad).explainer).execute();
    assert.equal(dropped.failed, 2);
    assert.equal(rows.length, 0);
  });

  it("최근 본 종목이 먼저 · 회차 상한을 넘으면 다음 회차", async () => {
    const many = Array.from({ length: EXPLANATION_BATCH_MAX_PER_RUN }, (_, i) => `C${i}`);
    const prices = Object.fromEntries([...many, "ETH"].map((s) => [s, 10]));
    const { batch, demand } = setup({ prices, tracked: many });
    demand.want("ETH", "long_term", T0);
    const spy = spyExplainer(() => llmText);
    const r = await batch(spy.explainer).execute();
    assert.equal(r.generated, EXPLANATION_BATCH_MAX_PER_RUN);
    assert.equal(r.deferred, many.length * 2 + 1 - EXPLANATION_BATCH_MAX_PER_RUN);
  });

  it("LLM 꺼짐 → 아무것도 하지 않는다(화면은 사실표 문장)", async () => {
    const { batch } = setup();
    const spy = spyExplainer(() => llmText);
    const r = await batch(spy.explainer, false).execute();
    assert.equal(spy.calls.length, 0);
    assert.equal(r.candidates, 0);
  });
});
