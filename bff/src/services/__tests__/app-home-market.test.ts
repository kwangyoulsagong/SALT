import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appHomeMarketService, toHomeMarketCoins, toHomeMarketEvents, toHomeMarketIndices } from "../app-home-market.service";
import { appKrStockService } from "../app-kr-stock.service";
import type { KrMarketSummaryVM, KrSummaryItemVM } from "../kr-stock.viewmodel";
import { marketOverviewService } from "../market-overview.service";
import type { MarketSummaryItemVM, MarketSummaryVM } from "../market-summary.viewmodel";

/** 홈 시장 블록(`BFF-REQ-046` FR-14) — 무엇을 보일지 BFF 가 고른다: 국내 지수 둘 · 코인 대표 둘 · 일정 셋 · 원천 실패면 그 줄만 */

const kr = (symbol: string, kind: "index" | "stock", rate = 0.5): KrSummaryItemVM => ({
  symbol, kind, name: symbol, logoUrl: null, currentPrice: 2600.12, change24h: rate, change24hAmount: 12, tags: [], sparkline: [1, 2, 3],
  high24h: null, low24h: null, tradeValue24h: null,
});
const coin = (symbol: string): MarketSummaryItemVM => ({
  symbol, name: symbol, logoUrl: `https://logo/${symbol}`, currentPrice: 130000000, change24h: -1.2, change24hAmount: -100, tags: [],
  sparkline: null, high24h: 1, low24h: 1, tradeValue24h: 1,
});
const krSummary = (over: Partial<KrMarketSummaryVM> = {}): KrMarketSummaryVM => ({
  assetClass: "kr_stock", changeBasis: "prev_close", featured: kr("KOSPI", "index"), items: [kr("KOSPI", "index"), kr("005930", "stock"), kr("KOSDAQ", "index"), kr("KRX100", "index")],
  sparklineWindowMinutes: 390, sparklineDate: "2026-11-26", breadth: null, headlines: [],
  schedule: [
    { kind: "kr_bok_rate", eventAt: "2026-11-27T01:00:00Z", daysUntil: 1 },
    { kind: "kr_cpi", eventAt: "2026-12-02T23:00:00Z", daysUntil: 6 },
    { kind: "kr_trade", eventAt: "2026-12-01T00:00:00Z", daysUntil: 5 },
    { kind: "kr_quad_expiry", eventAt: "2026-12-10T06:00:00Z", daysUntil: 14 },
  ],
  marketActions: [], degraded: false, ...over,
});
const coinSummary = (over: Partial<MarketSummaryVM> = {}): MarketSummaryVM => ({
  featured: coin("BTC"), items: [coin("BTC"), coin("ETH"), coin("XRP")], sparklineWindowMinutes: 60, breadth: null, headlines: [], degraded: false, ...over,
});

describe("홈 시장 블록 — 고르기", () => {
  afterEach(() => mock.restoreAll());

  it("국내는 지수만 · 대표와 목록 중복 제거 · 둘까지 · 상세 주소 없음", () => {
    const items = toHomeMarketIndices(krSummary());
    assert.deepEqual(items.map((i) => i.symbol), ["KOSPI", "KOSDAQ"]);
    assert.ok(items.every((i) => i.kind === "index" && i.href === null && i.logoUrl === null));
    assert.equal(items[0]!.changeRate, 0.5, "등락률은 서버 값 그대로");
  });

  it("코인은 대표 + 첫 칸(중복 제거) · 둘까지 · 상세 주소", () => {
    const items = toHomeMarketCoins(coinSummary());
    assert.deepEqual(items.map((i) => [i.symbol, i.href]), [["BTC", "/investments/BTC"], ["ETH", "/investments/ETH"]]);
  });

  it("대표가 없으면 목록에서 · 지수가 없으면 빈 배열", () => {
    assert.deepEqual(toHomeMarketCoins(coinSummary({ featured: null })).map((i) => i.symbol), ["BTC", "ETH"]);
    assert.deepEqual(toHomeMarketIndices(krSummary({ featured: null, items: [kr("005930", "stock")] })), []);
  });

  it("일정은 서버 순서 그대로 셋까지", () => {
    assert.deepEqual(toHomeMarketEvents(krSummary()).map((e) => e.kind), ["kr_bok_rate", "kr_cpi", "kr_trade"]);
  });

  it("원천 하나가 실패하면 그 줄만 빠지고 degraded · 꺼진 국내(disabled)도 같다", async () => {
    mock.method(appKrStockService, "getSummary", async () => ({ status: "disabled" }) as never);
    mock.method(marketOverviewService, "getSummary", async () => coinSummary());
    const a = await appHomeMarketService.getMarket("t");
    assert.deepEqual(a.items.map((i) => i.symbol), ["BTC", "ETH"]);
    assert.deepEqual(a.events, []);
    assert.equal(a.degraded, true);

    mock.restoreAll();
    mock.method(appKrStockService, "getSummary", async () => ({ status: "ok", ...krSummary() }) as never);
    mock.method(marketOverviewService, "getSummary", async () => {
      throw new Error("down");
    });
    const b = await appHomeMarketService.getMarket("t");
    assert.deepEqual(b.items.map((i) => i.symbol), ["KOSPI", "KOSDAQ"]);
    assert.equal(b.events.length, 3);
    assert.equal(b.degraded, true);
  });

  it("둘 다 받으면 지수 → 코인 순 · degraded false", async () => {
    mock.method(appKrStockService, "getSummary", async () => ({ status: "ok", ...krSummary() }) as never);
    mock.method(marketOverviewService, "getSummary", async () => coinSummary());
    const vm = await appHomeMarketService.getMarket("t");
    assert.deepEqual(vm.items.map((i) => i.symbol), ["KOSPI", "KOSDAQ", "BTC", "ETH"]);
    assert.equal(vm.degraded, false);
  });
});
