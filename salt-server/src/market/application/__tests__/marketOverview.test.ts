import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MarketOverviewPeriod,
  MarketOverviewSort,
  type Candle,
  type ExchangeQuotePort,
  type MarketAssetRepository,
  type MarketAssetView,
  type PeriodBaseline,
  type PriceHistoryRepository,
} from "../../domain";
import { GetMarketOverview } from "../ReadMarketData";
import { BackfillDailyHistory } from "../SyncMarketData";

const NOW = new Date("2026-09-21T03:00:00Z");
const DAY = 86_400_000;

const asset = (symbol: string, over: Partial<MarketAssetView> = {}): MarketAssetView => ({
  symbol,
  market: `KRW-${symbol}`,
  koreanName: symbol,
  englishName: symbol,
  currentPrice: 100,
  change24h: 1.5,
  high24h: 110,
  low24h: 90,
  volume24h: 1,
  tradeValue24h: 1000,
  logoUrl: `https://static.upbit.com/logos/${symbol}.png`,
  priceUpdatedAt: NOW,
  ...over,
});

const stubAssets = (rows: MarketAssetView[]) => {
  const calls: string[] = [];
  const repo = {
    findPage: async (q: { page: number; limit: number }) => {
      calls.push("findPage");
      const start = (q.page - 1) * q.limit;
      return { items: rows.slice(start, start + q.limit), total: rows.length };
    },
    findAllActive: async () => {
      calls.push("findAllActive");
      return rows;
    },
    // 배경 갱신 — 전부 신선하다고 답해 거래소를 부르지 않게 한다
    symbolsWithStalePrice: async () => [],
  } as unknown as MarketAssetRepository;
  return { repo, calls };
};

const stubPrices = (closes: Record<string, number>) => {
  const asked: PeriodBaseline[] = [];
  const repo = {
    baselineCloses: async (symbols: string[], baseline: PeriodBaseline) => {
      asked.push(baseline);
      return new Map(
        symbols.filter((s) => s in closes).map((s) => [s, closes[s]] as const)
      );
    },
  } as unknown as PriceHistoryRepository;
  return { repo, asked };
};

const noExchange = {} as ExchangeQuotePort;

describe("GetMarketOverview", () => {
  it("실시간이면 캔들을 읽지 않고 periodChange = change24h 다", async () => {
    const { repo: assets } = stubAssets([asset("BTC", { change24h: 2.25 })]);
    const { repo: prices, asked } = stubPrices({});
    const result = await new GetMarketOverview(assets, noExchange, prices, () => NOW).execute({});

    assert.equal(result.items[0]!.periodChange, 2.25);
    assert.equal(asked.length, 0);
  });

  it("기간이 있으면 기준 종가 대비 변동률이고, 기준이 없는 종목은 null 이다", async () => {
    const { repo: assets, calls } = stubAssets([
      asset("BTC", { currentPrice: 120 }),
      asset("NEW", { currentPrice: 50 }),
    ]);
    const { repo: prices, asked } = stubPrices({ BTC: 100 });
    const result = await new GetMarketOverview(assets, noExchange, prices, () => NOW).execute({
      period: MarketOverviewPeriod.OneWeek,
    });

    assert.deepEqual(
      result.items.map((i) => [i.symbol, i.periodChange]),
      [["BTC", 20], ["NEW", null]]
    );
    // 거래대금 정렬이면 DB 가 페이징한다
    assert.deepEqual(calls, ["findPage"]);
    assert.equal(asked[0]!.timeframe, "1d");
    // change24h 는 뜻을 바꾸지 않는다 — 실시간 WS 가 같은 이름으로 덮어쓴다
    assert.equal(result.items[0]!.change24h, 1.5);
  });

  it("변동률 + 기간 정렬은 전부 읽어 기간 값으로 정렬하고 여기서 자른다", async () => {
    const { repo: assets, calls } = stubAssets([
      asset("A", { currentPrice: 110 }), // +10%
      asset("B", { currentPrice: 150 }), // +50%
      asset("C", { currentPrice: 90 }), // -10%
      asset("D", { currentPrice: 100 }), // 기준 없음
    ]);
    const { repo: prices } = stubPrices({ A: 100, B: 100, C: 100 });
    const useCase = new GetMarketOverview(assets, noExchange, prices, () => NOW);

    const desc = await useCase.execute({
      sort: MarketOverviewSort.Change,
      order: "desc",
      period: MarketOverviewPeriod.OneMonth,
      limit: 2,
    });
    assert.deepEqual(desc.items.map((i) => i.symbol), ["B", "A"]);
    assert.deepEqual(desc.pagination, { page: 1, limit: 2, total: 4, totalPages: 2 });

    const ascPage2 = await useCase.execute({
      sort: MarketOverviewSort.Change,
      order: "asc",
      period: MarketOverviewPeriod.OneMonth,
      page: 2,
      limit: 2,
    });
    // 오름차순에서도 기준 없는 D 는 맨 뒤
    assert.deepEqual(ascPage2.items.map((i) => i.symbol), ["B", "D"]);
    assert.ok(calls.every((c) => c === "findAllActive"));
  });

  /**
   * 응답 모양 고정 (`SRV-REQ-009` FR-11 · FR-23). 필드는 **추가만** 허용된다 —
   * 이 목록에서 빠지거나 이름이 바뀌면 프론트가 조용히 깨진다.
   */
  it("응답 계약: 기본 limit=100 · 기존 필드 12개 유지 + periodChange 추가", async () => {
    const rows = Array.from({ length: 150 }, (_, i) => asset(`S${i}`));
    const { repo: assets } = stubAssets(rows);
    const { repo: prices } = stubPrices({});
    const result = await new GetMarketOverview(assets, noExchange, prices, () => NOW).execute({});

    assert.equal(result.items.length, 100);
    assert.deepEqual(result.pagination, { page: 1, limit: 100, total: 150, totalPages: 2 });
    assert.deepEqual(Object.keys(result.items[0]!), [
      "symbol",
      "market",
      "koreanName",
      "englishName",
      "currentPrice",
      "change24h",
      "high24h",
      "low24h",
      "volume24h",
      "tradeValue24h",
      "logoUrl",
      "priceUpdatedAt",
      "periodChange",
    ]);
  });
});

describe("BackfillDailyHistory", () => {
  const candles = (from: Date, n: number): Candle[] =>
    Array.from({ length: n }, (_, i) => ({
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
      timestamp: new Date(from.getTime() - (i + 1) * DAY),
    }));

  const run = async (opts: {
    earliest: Record<string, Date>;
    pages: Record<string, number[]>;
  }) => {
    const requests: Array<{ symbol: string; before?: Date }> = [];
    const saved: Record<string, number> = {};
    const served: Record<string, number> = {};
    const assets = {
      activeSymbols: async () => Object.keys(opts.pages),
    } as unknown as MarketAssetRepository;
    const exchange = {
      candlesByTimeframe: async (symbol: string, _tf: string, _count: number, before?: Date) => {
        requests.push({ symbol, before });
        const i = served[symbol] ?? 0;
        served[symbol] = i + 1;
        return candles(before!, opts.pages[symbol]![i] ?? 0);
      },
    } as unknown as ExchangeQuotePort;
    const prices = {
      earliestCandleStarts: async () => new Map(Object.entries(opts.earliest)),
      upsertCandles: async (symbol: string, _a: string, _tf: string, c: Candle[]) => {
        saved[symbol] = (saved[symbol] ?? 0) + c.length;
      },
    } as unknown as PriceHistoryRepository;
    const result = await new BackfillDailyHistory(assets, exchange, prices, () => NOW).execute();
    return { result, requests, saved };
  };

  it("가장 오래된 캔들 이전을 200개씩, 400일에 닿을 때까지 받는다", async () => {
    const { requests, saved } = await run({
      earliest: { BTC: new Date(NOW.getTime() - 120 * DAY) },
      pages: { BTC: [200, 200, 200] },
    });
    // 120일 + 200 = 320일 → 한 번 더 → 520일 ≥ 400 → 멈춤
    assert.equal(requests.length, 2);
    assert.equal(requests[0]!.before!.getTime(), NOW.getTime() - 120 * DAY);
    assert.equal(requests[1]!.before!.getTime(), NOW.getTime() - 320 * DAY);
    assert.equal(saved.BTC, 400);
  });

  it("덜 오면 상장일에 닿은 것이다 — 더 부르지 않는다", async () => {
    const { requests } = await run({
      earliest: { NEW: new Date(NOW.getTime() - 100 * DAY) },
      pages: { NEW: [37, 200] },
    });
    assert.equal(requests.length, 1);
  });

  it("이미 400일이 있거나 한 번도 수집되지 않은 심볼은 부르지 않는다(멱등)", async () => {
    const { requests } = await run({
      earliest: { OLD: new Date(NOW.getTime() - 500 * DAY) },
      pages: { OLD: [200], NONE: [200] },
    });
    assert.equal(requests.length, 0);
  });

  it("한 심볼이 실패해도 나머지를 받는다", async () => {
    const requests: string[] = [];
    const assets = { activeSymbols: async () => ["BAD", "BTC"] } as unknown as MarketAssetRepository;
    const exchange = {
      candlesByTimeframe: async (symbol: string, _tf: string, _c: number, before?: Date) => {
        requests.push(symbol);
        if (symbol === "BAD") throw new Error("429");
        return candles(before!, 10);
      },
    } as unknown as ExchangeQuotePort;
    const prices = {
      earliestCandleStarts: async () =>
        new Map([
          ["BAD", new Date(NOW.getTime() - 10 * DAY)],
          ["BTC", new Date(NOW.getTime() - 10 * DAY)],
        ]),
      upsertCandles: async () => undefined,
    } as unknown as PriceHistoryRepository;
    const result = await new BackfillDailyHistory(assets, exchange, prices, () => NOW).execute();
    assert.deepEqual(requests, ["BAD", "BTC"]);
    assert.equal(result.failed, 1);
    assert.equal(result.candles, 10);
  });
});
