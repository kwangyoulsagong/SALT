import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  ExchangeQuotePort,
  MarketAssetRepository,
  MarketAssetView,
  SymbolNewsPort,
} from "../../domain";
import { GetMarketSummary } from "../GetMarketSummary";

const view = (symbol: string, change24h = 1): MarketAssetView => ({
  symbol,
  market: `KRW-${symbol}`,
  koreanName: symbol,
  englishName: symbol,
  currentPrice: 1000,
  change24h,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
  tradeValue24h: 0,
  logoUrl: "",
  priceUpdatedAt: null,
});

const setup = (
  rows: MarketAssetView[],
  candles: (symbol: string) => Promise<Array<{ close: number }>>,
  breadthFails = false
) => {
  const calls: string[] = [];
  const assets = {
    findViews: async () => rows,
    breadth: async () => {
      if (breadthFails) throw new Error("db");
      return { up: 2, down: 1, flat: 0, total: 3 };
    },
  } as unknown as MarketAssetRepository;
  const exchange = {
    minuteCandles: async (symbol: string) => {
      calls.push(symbol);
      return candles(symbol);
    },
  } as unknown as ExchangeQuotePort;
  const news = {
    recent: async () => [
      { id: "a", title: "클래리티법 막혔다 - 동아일보", url: "u1", source: "g", summary: null, publishedAt: new Date(3) },
      { id: "b", title: "클래리티법 막혔다 - v.daum.net", url: "u2", source: "g", summary: null, publishedAt: new Date(2) },
      { id: "c", title: "ETF 자금 복귀", url: "u3", source: "c", summary: null, publishedAt: new Date(1) },
    ],
  } as unknown as SymbolNewsPort;
  let now = 0;
  const useCase = new GetMarketSummary(
    assets,
    exchange,
    news,
    { symbols: ["BTC", "ETH", "XRP"], wideMoveRate: 5 },
    () => now
  );
  return { useCase, calls, tick: (ms: number) => (now += ms) };
};

describe("GetMarketSummary (SRV-REQ-036)", () => {
  it("설정 순서대로, 첫 심볼이 대표다 — 저장소 순서와 무관하다", async () => {
    const { useCase } = setup([view("XRP"), view("BTC"), view("ETH")], async () => [
      { close: 2 },
      { close: 1 },
    ]);
    const result = await useCase.execute();
    assert.equal(result.featured?.symbol, "BTC");
    assert.deepEqual(result.items.map((i) => i.symbol), ["ETH", "XRP"]);
    // 거래소는 최신이 앞 — 시간순으로 뒤집는다
    assert.deepEqual(result.featured?.sparkline, [1, 2]);
  });

  it("대표 심볼이 목록에 없으면 featured 는 null 이고 나머지는 items 다", async () => {
    const { useCase } = setup([view("ETH"), view("XRP")], async () => []);
    const result = await useCase.execute();
    assert.equal(result.featured, null);
    assert.deepEqual(result.items.map((i) => i.symbol), ["ETH", "XRP"]);
  });

  it("스파크라인 한 종목 실패는 그 항목만 null + degraded", async () => {
    const { useCase } = setup([view("BTC"), view("ETH")], async (symbol) => {
      if (symbol === "ETH") throw new Error("429");
      return [{ close: 1 }, { close: 2 }];
    });
    const result = await useCase.execute();
    assert.equal(result.degraded, true);
    assert.equal(result.items[0]?.sparkline, null);
    assert.ok(result.featured?.sparkline);
  });

  it("스파크라인은 1분 캐시 — 그 안에 다시 부르지 않는다", async () => {
    const { useCase, calls, tick } = setup([view("BTC")], async () => [{ close: 1 }]);
    await useCase.execute();
    tick(30_000);
    await useCase.execute();
    assert.equal(calls.length, 1);
    tick(31_000);
    await useCase.execute();
    assert.equal(calls.length, 2);
  });

  it("태그 · 금액은 도메인 규칙 그대로", async () => {
    const { useCase } = setup([view("BTC", -6)], async () => []);
    const result = await useCase.execute();
    assert.deepEqual(result.featured?.tags, ["wide_move"]);
    assert.ok(result.featured!.change24hAmount! < 0);
  });

  it("분위기는 DB 집계 그대로, 실패하면 null + degraded — 나머지는 나간다", async () => {
    const ok = await setup([view("BTC")], async () => [{ close: 1 }, { close: 2 }]).useCase.execute();
    assert.deepEqual(ok.breadth, { up: 2, down: 1, flat: 0, total: 3 });
    assert.equal(ok.degraded, false);

    const failed = await setup([view("BTC")], async () => [{ close: 1 }], true).useCase.execute();
    assert.equal(failed.breadth, null);
    assert.equal(failed.degraded, true);
    assert.equal(failed.featured?.symbol, "BTC");
  });

  it("뉴스는 대표 종목 것 · 매체 꼬리를 떼고 같은 제목은 하나", async () => {
    const result = await setup([view("BTC")], async () => []).useCase.execute();
    assert.deepEqual(result.headlines.map((h) => h.title), ["클래리티법 막혔다", "ETF 자금 복귀"]);
  });
});
