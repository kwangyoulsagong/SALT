import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  catchUpOrder,
  catchUpStart,
  FIVE_MINUTE_MS,
  needsCatchUp,
  regularWindowAdvance,
  universeSnapshotRows,
  type Candle,
  type ExchangeQuotePort,
  type MarketAssetRepository,
  type PriceFillMarkStore,
  type PriceHistoryRepository,
  type WatchlistRepository,
} from "../../domain";
import { CatchUpPriceHistory, CollectPriceHistory } from "../SyncMarketData";

/**
 * 코인 5분봉 따라잡기(`SRV-REQ-057` FR-2) — 시각 주입 + 가짜 거래소로 수면을 재현한다.
 * 불변식: 깬 뒤 거래소가 봉을 준 구간에 구멍 0 · 회차 상한 · 같은 봉 재쓰기 0 · 위치는 앞으로만.
 */
const HOUR = 3600_000;
const T0 = new Date("2026-11-10T00:00:00Z");

/** 거래소 — 5분마다 봉. `quiet` 종목은 짝수 시간에만 체결(거래 없는 5분은 봉이 없다) */
const exchangeOf = (symbols: string[], quiet: string[] = [], clock: { now: Date }) => {
  const calls: Array<{ symbol: string; to?: Date }> = [];
  const start = T0.getTime() - 40 * 24 * HOUR;
  const all = (symbol: string): Candle[] => {
    const out: Candle[] = [];
    for (let t = start; t < clock.now.getTime(); t += FIVE_MINUTE_MS) {
      if (quiet.includes(symbol) && Math.floor(t / HOUR) % 2 === 1) continue;
      out.push({ open: 1, high: 1, low: 1, close: 1, volume: 1, timestamp: new Date(t) });
    }
    return out;
  };
  const port = {
    candlesByTimeframe: async (symbol: string, _tf: string, count: number, to?: Date) => {
      calls.push({ symbol, to });
      const limit = Math.min(count, 200);
      const before = (to ?? clock.now).getTime();
      return all(symbol)
        .filter((c) => c.timestamp.getTime() < before)
        .slice(-limit)
        .reverse();
    },
  } as unknown as ExchangeQuotePort;
  return { port, calls, all, symbols };
};

const storeOf = () => {
  const rows = new Map<string, Map<number, Candle>>();
  let rewrites = 0;
  const repo = {
    upsertCandles: async (symbol: string, _a: string, tf: string, candles: Candle[]) => {
      if (tf !== "5m") return;
      const m = rows.get(symbol) ?? new Map<number, Candle>();
      for (const c of candles) {
        const prev = m.get(c.timestamp.getTime());
        // 값이 같으면 쓰지 않는다(실 저장소의 WHERE IS DISTINCT FROM) — 다르면 재쓰기
        if (prev && prev.close !== c.close) rewrites++;
        m.set(c.timestamp.getTime(), c);
      }
      rows.set(symbol, m);
    },
    purgeOlderThan: async () => {},
  } as unknown as PriceHistoryRepository;
  return { repo, rows, rewrites: () => rewrites };
};

const marksOf = (initial: Record<string, Date> = {}) => {
  const marks = new Map(Object.entries(initial));
  const store: PriceFillMarkStore = {
    marks: async (_a, _t, symbols) => new Map(symbols.flatMap((s) => (marks.has(s) ? [[s, marks.get(s)!]] : []))),
    advance: async (_a, _t, next) => {
      for (const { symbol, filledThrough } of next) {
        const prev = marks.get(symbol);
        if (!prev || prev < filledThrough) marks.set(symbol, filledThrough);
      }
    },
  };
  return { store, marks };
};

const assetsOf = (symbols: string[]) =>
  ({
    activeSymbols: async () => symbols,
    topByTradeValue: async () => [...symbols].reverse(),
  }) as unknown as MarketAssetRepository;
const watchlistOf = (symbols: string[]) => ({ distinctSymbols: async () => symbols }) as unknown as WatchlistRepository;

/** 저장소에 없는, 거래소가 준 봉(지금 기준 30일 안) */
const holes = (ex: ReturnType<typeof exchangeOf>, rows: Map<string, Map<number, Candle>>, now: Date) =>
  ex.symbols.flatMap((s) =>
    ex
      .all(s)
      .filter((c) => c.timestamp.getTime() >= now.getTime() - 30 * 24 * HOUR && !rows.get(s)?.has(c.timestamp.getTime()))
      .map((c) => `${s}@${c.timestamp.toISOString()}`)
  );

describe("코인 5분봉 따라잡기 (SRV-REQ-057 FR-2)", () => {
  it("20시간 자고 깨면 — 정기 수집은 위치를 못 옮기고, 따라잡기 한 회차가 구멍을 0 으로", async () => {
    const symbols = ["BTC", "ETH", "QUIET"];
    const clock = { now: T0 };
    const ex = exchangeOf(symbols, ["QUIET"], clock);
    const store = storeOf();
    const marks = marksOf();

    // 잠들기 전: 30일 따라잡기로 시작 상태를 만든다(위치 없음 → 보관 창 시작부터)
    const catchUp = () =>
      new CatchUpPriceHistory(assetsOf(symbols), ex.port, store.repo, marks.store, watchlistOf([]), async () => [], () => clock.now);
    for (let i = 0; i < 5; i++) await catchUp().execute();
    assert.deepEqual(holes(ex, store.rows, clock.now), []);

    // 20시간 수면 → 깬 첫 정기 회차
    clock.now = new Date(T0.getTime() + 20 * HOUR);
    const collect = new CollectPriceHistory(assetsOf(symbols), ex.port, store.repo, marks.store, () => clock.now);
    const regular = await collect.execute();
    // 거래 없는 5분이 많은 QUIET 은 200개가 33시간을 덮어 위치에 닿는다 — 정기 수집이 옮긴다
    assert.equal(regular.marksAdvanced, 1, "BTC · ETH 의 200칸(16시간 40분) 창은 위치에 닿지 않는다");
    assert.ok(holes(ex, store.rows, clock.now).length > 0, "정기 수집만으로는 구멍이 남는다");

    const before = ex.calls.length;
    const result = await catchUp().execute();
    assert.deepEqual(holes(ex, store.rows, clock.now), []);
    assert.equal(result.pending, 0);
    assert.equal(ex.calls.length - before, 4, "BTC · ETH 만 2쪽씩(20시간 < 1000분 × 2) — QUIET 은 할 일 0");
    assert.equal(store.rewrites(), 0);

    // 다음 정기 회차는 창이 위치에 닿아 위치를 옮긴다 — 따라잡기는 할 일 0
    clock.now = new Date(clock.now.getTime() + 5 * 60_000);
    assert.equal((await collect.execute()).marksAdvanced, symbols.length);
    assert.equal((await catchUp().execute()).targets, 0);
  });

  it("회차 상한에 잘리면 다음 회차가 위치부터 잇는다 — 보유 · 관심이 먼저", async () => {
    const symbols = ["A", "B", "C"];
    const clock = { now: T0 };
    const ex = exchangeOf(symbols, [], clock);
    const store = storeOf();
    const start = new Date(T0.getTime() - 40 * HOUR);
    const marks = marksOf({ A: start, B: start, C: start });
    const run = () =>
      new CatchUpPriceHistory(assetsOf(symbols), ex.port, store.repo, marks.store, watchlistOf(["C"]), async () => ["B"], () => clock.now, 2).execute();

    const first = await run();
    assert.equal(first.calls, 2);
    assert.deepEqual(ex.calls.map((c) => c.symbol), ["B", "B"], "보유 B 먼저");
    assert.ok(marks.marks.get("B")! > start, "쪽마다 위치를 옮긴다");

    // 실제 회차처럼 정기 수집 → 따라잡기. 창(16시간 40분) 안으로 들어온 종목은 정기 수집이 위치를 옮긴다
    const collect = new CollectPriceHistory(assetsOf(symbols), ex.port, store.repo, marks.store, () => clock.now);
    for (let i = 0; i < 10; i++) {
      await collect.execute();
      await run();
    }
    const sinceStart = holes(ex, store.rows, clock.now).filter((h) => new Date(h.split("@")[1]) >= start);
    assert.equal(sinceStart.length, 0, "위치 뒤 구멍 0");
    assert.equal(store.rewrites(), 0);
  });
});

describe("따라잡기 규칙 — 경계", () => {
  const now = T0;
  it("시작 = 위치, 없거나 30일보다 앞이면 30일 전", () => {
    const floor = new Date(now.getTime() - 30 * 24 * HOUR);
    assert.deepEqual(catchUpStart(undefined, now), floor);
    assert.deepEqual(catchUpStart(new Date(floor.getTime() - 1), now), floor);
    const mark = new Date(now.getTime() - HOUR);
    assert.deepEqual(catchUpStart(mark, now), mark);
  });

  it("할 일 = 위치가 16시간 40분 창 밖", () => {
    assert.equal(needsCatchUp(undefined, now), true);
    assert.equal(needsCatchUp(new Date(now.getTime() - 1000 * 60_000), now), false);
    assert.equal(needsCatchUp(new Date(now.getTime() - 1000 * 60_000 - 1), now), true);
  });

  it("정기 창이 위치를 옮기는 조건 — 닿거나 이력 끝, 그리고 앞으로만", () => {
    const mark = new Date(now.getTime() - 2 * HOUR);
    const window = (oldestAgoMs: number, n = 200) =>
      Array.from({ length: n }, (_, i) => new Date(now.getTime() - oldestAgoMs + (i * oldestAgoMs) / n));
    assert.equal(regularWindowAdvance(undefined, window(3 * HOUR)), null, "위치가 없으면 따라잡기 몫");
    assert.ok(regularWindowAdvance(mark, window(3 * HOUR)), "창이 위치를 덮는다");
    assert.equal(regularWindowAdvance(mark, window(HOUR)), null, "창이 위치에 못 닿는다");
    assert.ok(regularWindowAdvance(mark, window(HOUR, 50)), "200 개 미만 = 거래소 이력 끝");
    assert.equal(regularWindowAdvance(now, window(3 * HOUR)), null, "뒤로 가지 않는다");
  });

  it("순서 — 겹치면 앞 자리 · 대문자", () => {
    assert.deepEqual(catchUpOrder(["btc"], ["ETH", "BTC"], ["XRP", "ETH"]), ["BTC", "ETH", "XRP"]);
  });
});

describe("추적 목록 스냅샷 행 (SRV-REQ-057 FR-7)", () => {
  it("코인은 활성 마켓 · 국내는 보유 → 관심 → 시총(순위는 시총 행만) · 한 종목 한 행", () => {
    const rows = universeSnapshotRows({
      cryptoActive: ["btc", "ETH"],
      kr: { held: ["005930"], watched: ["000660", "005930"], topByMarketCap: ["005930", "000660", "373220"] },
    });
    assert.deepEqual(rows, [
      { symbol: "BTC", assetType: "crypto", source: "active_market", rank: null },
      { symbol: "ETH", assetType: "crypto", source: "active_market", rank: null },
      { symbol: "005930", assetType: "kr_stock", source: "holding", rank: null },
      { symbol: "000660", assetType: "kr_stock", source: "watch", rank: null },
      { symbol: "373220", assetType: "kr_stock", source: "top_market_cap", rank: 3 },
    ]);
    assert.equal(universeSnapshotRows({ cryptoActive: [], kr: null }).length, 0);
  });
});
