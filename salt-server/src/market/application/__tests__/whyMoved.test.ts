import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isUsableSectorQuote,
  KrStockNotAvailableError,
  mergeMoveFacts,
  moveCardReasons,
  splitDailyMove,
  type AssetQuote,
  type CryptoWarningReader,
  type KrMarketAction,
  type KrMarketCalendarStore,
  type KrMarketStatusStore,
  type KrMoveSourceStore,
  type KrStockStore,
  type KrSupplementStore,
  type MarketAssetRepository,
  type MoveBetaReader,
  type MoveBetaRow,
  type MoveFact,
  type StoredKrStockQuote,
  type SymbolNewsPort,
  UnknownMarketSymbolError,
} from "../../domain";
import { GetCryptoWhyMoved, GetKrWhyMoved } from "../GetWhyMoved";
import type { MoveDependencies } from "../moveCard";
import { ListKrStockQuotes, type KrStockReadDependencies } from "../ReadKrStock";

/** F016 단계 C — 오늘 왜 움직였나: ① 분해 · ② 같은 날 사실 · 카드 조건(SRV-REQ-051 FR-7~10) */

const near = (a: number | null | undefined, b: number, eps = 1e-9) => assert.ok(a !== null && a !== undefined && Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("splitDailyMove — 합 = 등락 · 경계 표", () => {
  it("국내 세 단 · β 없음(β=1) · 업종 등락 없음 · 업종 β 없음 · 지수 실패 · 코인 · 기준 자체", () => {
    const table: Array<[string, Parameters<typeof splitDailyMove>[0], { market: number; sector: number | null; method: string } | null]> = [
      ["세 단", { total: -8, marketChange: -3, sectorChange: -5, beta: { market: 1.2, sector: 0.5 } }, { market: -3.6, sector: -1, method: "regression" }],
      ["β 없음 → 시장 조정", { total: -8, marketChange: -3, sectorChange: -5, beta: null }, { market: -3, sector: null, method: "market_adjusted" }],
      ["시장 β 만 NaN → 시장 조정", { total: -8, marketChange: -3, sectorChange: -5, beta: { market: Number.NaN, sector: 0.5 } }, { market: -3, sector: null, method: "market_adjusted" }],
      ["업종 등락 없음 → 두 단", { total: -8, marketChange: -3, sectorChange: null, beta: { market: 1.2, sector: 0.5 } }, { market: -3.6, sector: null, method: "regression" }],
      ["업종 β 없음 → 두 단", { total: -8, marketChange: -3, sectorChange: -5, beta: { market: 1.2, sector: null } }, { market: -3.6, sector: null, method: "regression" }],
      ["지수 실패 → 분해 없음", { total: -8, marketChange: null, sectorChange: -5, beta: { market: 1.2, sector: 0.5 } }, null],
      ["코인", { total: -12, marketChange: -3, sectorChange: null, beta: { market: 1.03, sector: null } }, { market: -3.09, sector: null, method: "regression" }],
      ["기준 자체(BTC)", { total: -3, marketChange: null, sectorChange: null, beta: null, isBenchmark: true }, { market: -3, sector: null, method: "benchmark" }],
      ["등락 NaN → 없음", { total: Number.NaN, marketChange: -3, sectorChange: null, beta: null }, null],
    ];
    for (const [name, input, want] of table) {
      const got = splitDailyMove(input);
      if (want === null) {
        assert.equal(got, null, name);
        continue;
      }
      assert.ok(got, name);
      near(got.market, want.market);
      assert.equal(got.sector === null ? null : Math.round(got.sector * 1e9) / 1e9, want.sector, name);
      assert.equal(got.method, want.method, name);
      // 합 = 등락(반올림 전)
      near(got.market + (got.sector ?? 0) + got.idio, input.total);
    }
  });
});

describe("moveCardReasons — 문턱 max(최소 %, k × σ) · 사건 · 대칭", () => {
  const policy = { k: 2.5, minRate: 3 };
  const none = { vi: false, marketAction: false, halt: false, warning: false };
  it("경계 표", () => {
    const table: Array<[number, number | null, Partial<typeof none>, string[]]> = [
      [-5.0, 0.02, {}, ["large_move"]], // 문턱 5.0 — 같으면 선다
      [-4.99, 0.02, {}, []],
      [5.0, 0.02, {}, ["large_move"]], // 오른 날 대칭
      [3.0, 0.005, {}, ["large_move"]], // σ 작음 → 최소 % 3
      [2.99, 0.005, {}, []],
      [3.0, null, {}, ["large_move"]], // σ 모름 → 최소 % 만
      [0.5, 0.02, { vi: true }, ["vi"]],
      [-9, 0.02, { halt: true, marketAction: true }, ["large_move", "market_action", "halt"]],
      [Number.NaN, 0.02, { warning: true }, ["warning"]],
    ];
    for (const [rate, sigma, ev, want] of table) {
      assert.deepEqual(moveCardReasons(rate, sigma === null ? null : sigma * 100, { ...none, ...ev }, policy), want, `${rate}/${sigma}`); // 표의 σ 는 비율로 적었다 — % 로
    }
  });
});

describe("mergeMoveFacts — 시각순 · 상한 · 실패 kind · 중복 id", () => {
  const f = (id: string, minute: number, kind: MoveFact["kind"] = "news"): MoveFact => ({
    id, kind, at: new Date(Date.UTC(2026, 10, 9, 0, minute)), source: "x", title: id, value: null,
  });
  it("최신이 앞 · 같은 시각은 id 순 · 같은 id 하나 · 실패 원천의 kind 만 unavailable · 상한", () => {
    const { facts, unavailable } = mergeMoveFacts(
      [
        { kinds: ["news", "disclosure"], facts: [f("b", 5), f("a", 5), f("c", 1)] },
        { kinds: ["vi"], facts: null },
        { kinds: ["flow"], facts: [f("a", 5, "flow"), f("d", 9, "flow")] },
      ],
      3
    );
    assert.deepEqual(facts.map((x) => x.id), ["d", "a", "b"]);
    assert.deepEqual(unavailable, ["vi"]);
  });
});

describe("isUsableSectorQuote — 업종은 30분 박자라 장중엔 40분 안만", () => {
  const now = new Date("2026-11-09T02:00:00Z");
  it("경계 표", () => {
    const table: Array<[string, number, boolean, boolean]> = [
      ["2026-11-09", 39, true, true],
      ["2026-11-09", 41, true, false],
      ["2026-11-09", 300, false, true], // 장 밖이면 같은 거래일 값
      ["2026-11-06", 1, true, false], // 다른 거래일
    ];
    for (const [d, minutes, trading, want] of table) {
      assert.equal(
        isUsableSectorQuote({ tradeDate: d, updatedAt: new Date(now.getTime() - minutes * 60_000) }, "2026-11-09", trading, now),
        want,
        `${d}/${minutes}/${trading}`
      );
    }
  });
});

// ==================== 유스케이스 ====================

const NOW = new Date("2026-11-09T02:00:00Z"); // 11:00 KST 장중
const quote = (o: Partial<StoredKrStockQuote> = {}): StoredKrStockQuote => ({
  code: "005930", name: "삼성전자", market: "KOSPI", homepage: null, logoSource: null,
  price: 92_000, change: -8000, changeRate: -8, volume: 0n, tradeValue: 0, marketCap: 1, basePrice: 100_000,
  upperLimit: 130_000, lowerLimit: 70_000, statusCode: null, warnCode: null, isHalted: false, viCode: "N",
  cautionFlag: false, managedFlag: false, liquidationFlag: false, shortOverheatFlag: false, lastTradeAt: null,
  per: null, pbr: null, eps: null, bps: null, week52High: null, week52Low: null, foreignRate: null,
  openPrice: null, highPrice: null, lowPrice: null, feed: "poll_1m", priceUpdatedAt: new Date("2026-11-09T01:59:00Z"),
  ...o,
});
const openCalendar: KrMarketCalendarStore = {
  upsertDays: async () => {},
  daysFromDailyCandles: async () => [],
  days: async (from, to) => {
    const out = [];
    for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86_400_000)) {
      out.push({ date: d.toISOString().slice(0, 10), isOpen: true, isTradingDay: true, isBusinessDay: true, isSettlementDay: true });
    }
    return out;
  },
};
const beta = (o: Partial<MoveBetaRow> = {}): MoveBetaRow => ({
  symbol: "005930", asOf: new Date("2026-11-09T00:00:00Z"), marketIndex: "0001", sectorIndex: "0013",
  betaMarket: 1.2, betaSector: 0.5, sigmaRate: 2, ...o,
});
const betaReader = (rows: MoveBetaRow[] | Error): MoveBetaReader => ({
  latest: async () => {
    if (rows instanceof Error) throw rows;
    return new Map(rows.map((r) => [r.symbol, r]));
  },
});

interface KrWorld {
  quote?: StoredKrStockQuote | null;
  betas?: MoveBetaRow[] | Error;
  index?: { changeRate: number; updatedAt: Date } | null;
  sector?: { changeRate: number; updatedAt: Date; tradeDate: string } | null;
  actions?: KrMarketAction[] | Error;
  news?: Error;
}

const krDeps = (w: KrWorld): { read: KrStockReadDependencies; move: MoveDependencies } => {
  const q = w.quote === undefined ? quote() : w.quote;
  const read = {
    store: { quote: async () => q, quotes: async () => (q ? [q] : []), baselineCloses: async () => new Map() } as unknown as KrStockStore,
    calendar: openCalendar,
    provider: () => ({ status: "ok", since: null, lastSuccessAt: null, realtime: null }) as never,
    supplement: {
      indexQuotes: async () =>
        w.index === null ? [] : [{ code: "0001", value: 2500, change: -75, changeRate: w.index?.changeRate ?? -3, updatedAt: w.index?.updatedAt ?? new Date("2026-11-09T01:59:00Z") }],
    } as unknown as KrSupplementStore,
    summaryIndices: ["0001"],
    status: {
      latestViEvents: async () => new Map(),
      marketActions: async () => {
        if (w.actions instanceof Error) throw w.actions;
        return w.actions ?? [];
      },
    } as unknown as KrMarketStatusStore,
    orderbookSource: {} as never,
    moveSources: {
      sectorIndices: async () =>
        w.sector === null ? [] : [{ code: "0013", value: 1, change: 0, changeRate: w.sector?.changeRate ?? -5, updatedAt: w.sector?.updatedAt ?? new Date("2026-11-09T01:45:00Z"), tradeDate: w.sector?.tradeDate ?? "2026-11-09" }],
      newsTitles: async () => {
        if (w.news) throw w.news;
        return [{ serial: "s1", kind: "news", providerName: "연합뉴스", publishedAt: new Date("2026-11-09T01:30:00Z"), title: "반도체 약세", related: [] }];
      },
      indexNames: async (codes: string[]) => new Map([["0001", "코스피"], ["0013", "전기전자"]].filter(([c]) => codes.includes(c!)) as Array<[string, string]>),
      latestProgramFlow: async () => ({ code: "005930", at: new Date("2026-11-09T01:53:00Z"), netQuantity: -1n, netValue: -60_550_831_650.4, buyValue: 1, sellValue: 2, collectedAt: NOW }),
    } as unknown as KrMoveSourceStore,
    now: () => NOW,
  } satisfies KrStockReadDependencies;
  const move: MoveDependencies = {
    betas: betaReader(w.betas ?? [beta()]),
    warnings: { latest: async () => new Map() },
    policy: { k: 2.5, minRate: 3 },
  };
  return { read, move };
};
const runKr = (w: KrWorld) => {
  const { read, move } = krDeps(w);
  return new GetKrWhyMoved(read, move).execute("005930");
};

describe("GetKrWhyMoved — 읽는 사람 누구나(ADR-011) · 저장값만", () => {
  it("큰 하락 — 세 단 분해(%p 둘째 자리) · 카드 · 평소 변동 · 사실 시각순(제목 · 프로그램 원 정수)", async () => {
    const r = await runKr({});
    assert.equal(r.show, true);
    assert.deepEqual(r.reasons, ["large_move"]);
    assert.equal(r.usualRate, 2);
    assert.deepEqual(
      { total: r.split!.total, market: r.split!.market, sector: r.split!.sector, idio: r.split!.idio, method: r.split!.method, sectorIndex: r.split!.sectorIndex, sectorName: r.split!.sectorName },
      { total: -8, market: -3.6, sector: -1, idio: -3.4, method: "regression", sectorIndex: "0013", sectorName: "전기전자" }
    );
    assert.deepEqual(r.facts.map((f) => f.kind), ["flow", "news"]);
    assert.equal(r.facts[0]!.value, -60_550_831_650);
    assert.deepEqual(r.unavailable, []);
  });

  it("β 못 읽음(뷰 없음 · 7일 넘음) → 시장 조정 라벨 · 업종 몫 없음", async () => {
    for (const betas of [new Error("relation does not exist"), [beta({ asOf: new Date("2026-10-30T00:00:00Z") })]]) {
      const r = await runKr({ betas });
      assert.equal(r.split!.method, "market_adjusted");
      assert.equal(r.split!.sector, null);
      assert.equal(r.split!.market, -3);
      assert.equal(r.usualRate, null);
    }
  });

  it("업종 값이 41분 묵음(장중) → 두 단 · 지수가 다른 거래일 → 분해 없음 · 카드 없음", async () => {
    const stale = await runKr({ sector: { changeRate: -5, updatedAt: new Date(NOW.getTime() - 41 * 60_000), tradeDate: "2026-11-09" } });
    assert.equal(stale.split!.sector, null);
    assert.deepEqual([stale.split!.sectorIndex, stale.split!.sectorName], [null, null]); // 쓰지 않은 업종 이름은 싣지 않는다
    assert.equal(stale.split!.idio, -4.4);
    // 지수가 종목보다 늦은 날(주말 재기동 첫 회차 — 마지막 거래일 값 그대로)은 쓴다
    const weekendRestart = await runKr({ quote: quote({ priceUpdatedAt: new Date("2026-11-06T06:30:00Z") }), index: { changeRate: -3, updatedAt: new Date("2026-11-08T03:00:00Z") } });
    assert.ok(weekendRestart.split);
    const noIndex = await runKr({ index: { changeRate: -1, updatedAt: new Date("2026-11-06T06:30:00Z") } });
    assert.equal(noIndex.split, null);
    assert.equal(noIndex.show, false);
    assert.deepEqual(noIndex.reasons, ["large_move"]); // 이유는 남는다 — ①이 없어 서지 않을 뿐
  });

  it("작은 등락 → 카드 없음(①②는 준다 — 상세 접힌 칸) · 시장 조치 날은 작아도 카드", async () => {
    const small = await runKr({ quote: quote({ changeRate: -1 }) });
    assert.equal(small.show, false);
    assert.ok(small.split);
    const cb: KrMarketAction = { market: "KOSPI", tradeDate: "2026-11-09", kind: "circuit_breaker", stage: 1, direction: "down", startedAt: new Date("2026-11-09T01:10:00Z"), endedAt: null, source: "inferred" };
    const action = await runKr({ quote: quote({ changeRate: -1 }), actions: [cb] });
    assert.equal(action.show, true);
    assert.deepEqual(action.reasons, ["market_action"]);
    assert.equal(action.facts.find((f) => f.kind === "market_action")!.title, "circuit_breaker:1:down");
  });

  it("원천 하나 실패 → 그 kind 만 unavailable(나머지 사실 · 분해는 그대로)", async () => {
    const r = await runKr({ news: new Error("db"), actions: new Error("db") });
    assert.deepEqual(r.unavailable.sort(), ["disclosure", "market_action", "news"]);
    assert.deepEqual(r.facts.map((f) => f.kind), ["flow"]);
    assert.ok(r.split);
  });

  it("정지 · 경보는 상태 사실 — 정지는 마지막 체결 시각 · 경보는 그날 시작 · 카드 이유", async () => {
    const r = await runKr({ quote: quote({ changeRate: 0, isHalted: true, warnCode: "02", lastTradeAt: new Date("2026-11-09T01:20:00Z") }) });
    assert.deepEqual(r.reasons, ["halt", "warning"]);
    const halt = r.facts.find((f) => f.kind === "halt")!;
    assert.deepEqual([halt.title, halt.at], ["paused", "2026-11-09T01:20:00.000Z"]);
    assert.equal(r.facts.find((f) => f.kind === "warning")!.at, "2026-11-08T15:00:00.000Z");
  });

  it("읽는 사람을 받지 않는다(소유자 판정 없음) · 없는 종목 · 형식 틀림만 404", async () => {
    assert.equal(GetKrWhyMoved.prototype.execute.length, 1);
    await assert.rejects(runKr({ quote: null }), KrStockNotAvailableError);
    const { read, move } = krDeps({});
    await assert.rejects(new GetKrWhyMoved(read, move).execute("../x"), KrStockNotAvailableError);
  });
});

describe("ListKrStockQuotes — 행 카드 표시(상세와 같은 판정)", () => {
  it("큰 등락 행만 moveCard · β 뷰 실패면 최소 % 만으로", async () => {
    const big = quote({ code: "005930", changeRate: -8 });
    const small = quote({ code: "000660", changeRate: -4 });
    const run = async (betas: MoveBetaRow[] | Error) => {
      const { read } = krDeps({});
      const deps = {
        ...read,
        store: { quotes: async () => [big, small], baselineCloses: async () => new Map() } as unknown as KrStockStore,
        status: { latestViEvents: async () => new Map(), marketActions: async () => [] } as unknown as KrMarketStatusStore,
        move: { betas: betaReader(betas), policy: { k: 2.5, minRate: 3 } },
      };
      const r = await new ListKrStockQuotes(deps).execute({ limit: 10, offset: 0, sort: "marketCap", order: "desc", period: "realtime" } as never);
      return Object.fromEntries(r.items.map((i) => [i.code, i.moveCard]));
    };
    // σ 2% → 문턱 5% · 000660 σ 1% → 문턱 3%
    assert.deepEqual(await run([beta(), beta({ symbol: "000660", sigmaRate: 1 })]), { "005930": true, "000660": true });
    assert.deepEqual(await run([beta(), beta({ symbol: "000660", sigmaRate: 2 })]), { "005930": true, "000660": false });
    assert.deepEqual(await run(new Error("no view")), { "005930": true, "000660": true });
  });
});

// ==================== 코인 ====================

const coin = (symbol: string, change24h: number | null): AssetQuote => ({
  symbol, assetType: "crypto", koreanName: symbol, currentPrice: 1, change24h, tradeValue24h: 1, priceUpdatedAt: NOW,
});
const runCrypto = async (
  symbol: string,
  o: { quotes?: AssetQuote[]; betas?: MoveBetaRow[]; warning?: { warning: boolean; cautions: string[]; fetchedAt: Date } | Error; news?: Error } = {}
) => {
  const assets = { findQuotes: async (s: string[]) => (o.quotes ?? [coin("ETH", -12), coin("BTC", -3)]).filter((q) => s.includes(q.symbol)) } as unknown as MarketAssetRepository;
  const news: SymbolNewsPort = {
    recent: async () => {
      if (o.news) throw o.news;
      return [
        { id: "n1", title: "ETH 급락", summary: null, url: "u", source: "coindesk", publishedAt: new Date("2026-11-09T01:00:00Z") },
        { id: "n0", title: "어제 기사", summary: null, url: "u", source: "coindesk", publishedAt: new Date("2026-11-08T23:00:00Z") },
      ];
    },
  };
  const warnings: CryptoWarningReader = {
    latest: async () => {
      if (o.warning instanceof Error) throw o.warning;
      return new Map(o.warning ? [[`KRW-${symbol.toUpperCase()}`, o.warning]] : []);
    },
  };
  return new GetCryptoWhyMoved(
    assets,
    news,
    { betas: betaReader(o.betas ?? [beta({ symbol: "KRW-ETH", marketIndex: "KRW-BTC", sectorIndex: null, betaMarket: 1.1, betaSector: null, sigmaRate: 4 })]), warnings, policy: { k: 2.5, minRate: 3 } },
    () => NOW
  ).execute(symbol);
};

describe("GetCryptoWhyMoved — 로그인 사용자 · BTC 몫 + 종목 몫", () => {
  it("ETH −12% · BTC −3% · β 1.1 → BTC 몫 −3.3 · 종목 −8.7 · 그날(09:00 KST 뒤) 기사만 · 경보 사실", async () => {
    const r = await runCrypto("eth", { warning: { warning: true, cautions: ["PRICE_FLUCTUATIONS"], fetchedAt: new Date("2026-11-09T00:30:00Z") } });
    assert.equal(r!.symbol, "ETH");
    assert.deepEqual([r!.split!.market, r!.split!.idio, r!.split!.sector, r!.split!.marketIndex], [-3.3, -8.7, null, "KRW-BTC"]);
    assert.equal(r!.show, true);
    assert.deepEqual(r!.reasons, ["large_move", "warning"]);
    assert.deepEqual(r!.facts.map((f) => f.title), ["ETH 급락", "caution:PRICE_FLUCTUATIONS", "warning"]); // 같은 시각은 id 순
  });

  it("BTC 는 기준 자체 — 시장 몫이 전부 · 3일 묵은 경보 스냅샷은 사실 아님 · 원천 실패는 그 kind 만", async () => {
    const btc = await runCrypto("BTC", { betas: [], warning: { warning: true, cautions: [], fetchedAt: new Date("2026-11-06T00:00:00Z") } });
    assert.deepEqual([btc!.split!.method, btc!.split!.market, btc!.split!.idio], ["benchmark", -3, 0]);
    assert.equal(btc!.facts.some((f) => f.kind === "crypto_warning"), false);
    const failed = await runCrypto("ETH", { news: new Error("x"), warning: new Error("x") });
    assert.deepEqual(failed!.unavailable.sort(), ["crypto_news", "crypto_warning"]);
  });

  it("없는 종목은 404(MARKET_SYMBOL_NOT_FOUND) · 등락 모름이면 분해 · 카드 없음", async () => {
    await assert.rejects(runCrypto("NOPE"), UnknownMarketSymbolError);
    const r = await runCrypto("ETH", { quotes: [coin("ETH", null), coin("BTC", -3)] });
    assert.equal(r!.split, null);
    assert.equal(r!.show, false);
  });
});

describe("같은 날 사실 측정 태그(F017 단계 6) — 소식에만 · 원천 관련 종목으로 · 실패해도 사실은 그대로", () => {
  const fakeTag = (calls: Array<{ market: string; ids: string[]; related: string[][] }>) => ({
    execute: async (market: "kr" | "crypto", items: ReadonlyArray<{ id: string; related: readonly string[] }>) => {
      calls.push({ market, ids: items.map((i) => i.id), related: items.map((i) => [...i.related]) });
      return new Map(
        items.map((i) => [i.id, { eventKind: "contract", eventKindText: "수주 · 공급계약", label: "few" as const, reaction: { days: 1 as const, sample: 0, upRate: null, mean: null, baseUpRate: null }, reaction5d: null, preMove5d: null, asOf: null, preregKey: "news-reaction@1" }])
      );
    },
  });

  it("국내: 제목 사실에만 tag · 프로그램 매매 사실엔 칸 없음", async () => {
    const calls: Array<{ market: string; ids: string[]; related: string[][] }> = [];
    const { read, move } = krDeps({});
    const r = await new GetKrWhyMoved({ ...read, tagNews: fakeTag(calls) }, move).execute("005930");
    assert.deepEqual(calls, [{ market: "kr", ids: ["kr-news:s1"], related: [[]] }]);
    assert.equal(r.facts.find((f) => f.kind === "news")!.tag?.eventKind, "contract");
    assert.equal("tag" in r.facts.find((f) => f.kind === "flow")!, false);
  });

  it("코인: 그날 기사만 태그에 · 원천 심볼 없으면 그 종목 하나로 센다", async () => {
    const calls: Array<{ market: string; ids: string[]; related: string[][] }> = [];
    const assets = { findQuotes: async (s: string[]) => [coin("ETH", -12), coin("BTC", -3)].filter((q) => s.includes(q.symbol)) } as unknown as MarketAssetRepository;
    const news: SymbolNewsPort = {
      recent: async () => [{ id: "n1", title: "ETH 해킹", summary: null, url: "u", source: "s", publishedAt: new Date("2026-11-09T01:00:00Z") }],
    } as unknown as SymbolNewsPort;
    const r = await new GetCryptoWhyMoved(
      assets,
      news,
      { betas: betaReader([]), warnings: { latest: async () => new Map() }, policy: { k: 2.5, minRate: 3 } },
      () => NOW,
      fakeTag(calls)
    ).execute("ETH");
    assert.deepEqual(calls, [{ market: "crypto", ids: ["crypto-news:n1"], related: [["ETH"]] }]);
    assert.equal(r.facts[0]!.tag?.label, "few");
  });
});
