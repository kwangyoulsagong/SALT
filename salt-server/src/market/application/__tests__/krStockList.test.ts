import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KrStockNotAvailableError,
  type KrMarketCalendarStore,
  type KrStockStore,
  type StoredKrStockQuote,
  type WatchlistItem,
  type WatchlistRepository,
} from "../../domain";
import { AddToWatchlist, ListWatchlist } from "../ManageWatchlist";
import { ListKrStockQuotes } from "../ReadKrStock";

/**
 * F011 슬라이스 3 — 국내 주식 표가 코인 표와 같은 필터(정렬 · 순서 · 기간)를 받고, 관심 종목에 국내 주식을 담는다.
 */

const OWNER = "owner@example.com";

const quote = (code: string, o: Partial<StoredKrStockQuote> = {}): StoredKrStockQuote => ({
  code,
  name: `종목${code}`,
  market: "KOSPI",
  price: 10_000,
  change: 0,
  changeRate: 0,
  volume: 0n,
  tradeValue: 0,
  marketCap: 1,
  basePrice: 10_000,
  upperLimit: 13_000,
  lowerLimit: 7_000,
  statusCode: null,
  warnCode: null,
  isHalted: false,
  per: null,
  pbr: null,
  eps: null,
  bps: null,
  week52High: null,
  week52Low: null,
  foreignRate: null,
  openPrice: 9_900,
  highPrice: 10_200,
  lowPrice: 9_800.4,
  feed: "poll_1m",
  priceUpdatedAt: new Date("2026-10-08T01:00:00Z"),
  ...o,
});

const calendar: KrMarketCalendarStore = {
  upsertDays: async () => {},
  daysFromDailyCandles: async () => [],
  days: async () => [],
};

const storeWith = (quotes: StoredKrStockQuote[], closes = new Map<string, number>()) => {
  const calls: number[] = [];
  const store = {
    quotes: async (q: { codes?: string[] }) => (q.codes ? quotes.filter((x) => q.codes!.includes(x.code)) : quotes),
    quote: async (code: string) => quotes.find((x) => x.code === code) ?? null,
    findListing: async (code: string) =>
      code === "005930" ? { code, name: "삼성전자", market: "KOSPI" as const } : null,
    baselineCloses: async (_codes: string[], n: number) => {
      calls.push(n);
      return closes;
    },
  } as unknown as KrStockStore;
  return { store, calls };
};

const list = (store: KrStockStore) =>
  new ListKrStockQuotes({
    store,
    calendar,
    viewerEmails: [OWNER],
    provider: () => ({ status: "ok", since: null, lastSuccessAt: null, realtime: { state: "idle", subscribed: 0, lastTickAt: null } }),
    now: () => new Date("2026-10-08T01:00:30Z"),
  });

const viewer = { userId: "u1", email: OWNER };
const base = { limit: 50, offset: 0, sort: "all" as const, order: "desc" as const, period: "realtime" as const };

describe("ListKrStockQuotes — 코인 표와 같은 필터", () => {
  const quotes = [
    quote("000001", { marketCap: 300, tradeValue: 10, price: 500, changeRate: 1.5, name: "나" }),
    quote("000002", { marketCap: 100, tradeValue: 30, price: 900, changeRate: -2, name: "가" }),
    quote("000003", { marketCap: 200, tradeValue: 20, price: 100, changeRate: 0.5, name: "다" }),
  ];

  it("기본은 시가총액 내림차순 · 당일 시 · 고 · 저를 원 정수로 · 실시간이면 기간 변동률 = 전일 대비", async () => {
    const { store, calls } = storeWith(quotes);
    const r = await list(store).execute(viewer, base);
    assert.deepEqual(r.items.map((i) => i.code), ["000001", "000003", "000002"]);
    assert.equal(r.items[0]!.lowPrice, 9_800);
    assert.equal(r.items[0]!.highPrice, 10_200);
    assert.equal(r.items[0]!.periodChange, 1.5);
    assert.deepEqual(calls, [], "실시간은 일봉을 읽지 않는다");
  });

  it("거래대금 · 가격 · 이름 · 오름차순", async () => {
    const { store } = storeWith(quotes);
    const codes = async (sort: "trade_value" | "price" | "name", order: "asc" | "desc") =>
      (await list(store).execute(viewer, { ...base, sort, order })).items.map((i) => i.code);
    assert.deepEqual(await codes("trade_value", "desc"), ["000002", "000003", "000001"]);
    assert.deepEqual(await codes("price", "asc"), ["000003", "000001", "000002"]);
    assert.deepEqual(await codes("name", "asc"), ["000002", "000001", "000003"]);
  });

  it("기간 변동률 — 7d 는 5 거래일 전 종가, 기준 없는 종목은 null 이고 정렬에서 뒤로", async () => {
    const { store, calls } = storeWith(quotes, new Map([["000001", 400], ["000002", 1_000]]));
    const r = await list(store).execute(viewer, { ...base, sort: "change", order: "asc", period: "7d" });
    assert.deepEqual(calls, [5]);
    assert.deepEqual(r.items.map((i) => [i.code, i.periodChange]), [
      ["000002", -10],
      ["000001", 25],
      ["000003", null],
    ]);
  });

  it("페이지는 정렬 뒤에 자른다", async () => {
    const { store } = storeWith(quotes);
    const r = await list(store).execute(viewer, { ...base, limit: 2, offset: 1, sort: "trade_value" });
    assert.deepEqual(r.items.map((i) => i.code), ["000003", "000001"]);
    assert.equal(r.nextOffset, null);
  });

  it("소유자가 아니면 404", async () => {
    const { store } = storeWith(quotes);
    await assert.rejects(list(store).execute({ userId: "u2", email: "x@example.com" }, base), KrStockNotAvailableError);
  });
});

const fakeWatchlist = (rows: WatchlistItem[] = []) => {
  const added: Array<Record<string, unknown>> = [];
  let excluded: unknown;
  const repo: WatchlistRepository = {
    exists: async () => false,
    add: async (input) => {
      added.push(input);
      return { ...input, id: "w1", lastUpdated: null, addedAt: new Date() } as WatchlistItem;
    },
    findPage: async (_u, _a, _p, _l, exclude) => {
      excluded = exclude;
      const items = rows.filter((r) => !(exclude ?? []).includes(r.assetType));
      return { items, total: items.length };
    },
    removeOwned: async () => true,
    distinctSymbols: async () => [],
    applyPrices: async () => 0,
  };
  return { repo, added, excluded: () => excluded };
};

const noExchange = {} as never;

describe("AddToWatchlist — 국내 주식", () => {
  it("소유자 · 마스터에 있는 코드면 마스터 이름과 저장 시세로 담는다", async () => {
    const w = fakeWatchlist();
    const { store } = storeWith([quote("005930", { price: 269_000, changeRate: 0.19 })]);
    await new AddToWatchlist(w.repo, noExchange, { store, viewerEmails: [OWNER] }).execute({
      userId: "u1",
      email: OWNER,
      assetType: "kr_stock",
      symbol: "005930",
      name: "아무 이름",
    });
    assert.equal(w.added[0]!.name, "삼성전자");
    assert.equal(w.added[0]!.currentPrice, 269_000);
    assert.equal(w.added[0]!.priceChange24h, 0.19);
  });

  it("비소유자 · 마스터에 없는 코드는 같은 404", async () => {
    const { store } = storeWith([]);
    const add = new AddToWatchlist(fakeWatchlist().repo, noExchange, { store, viewerEmails: [OWNER] });
    const cmd = { userId: "u1", assetType: "kr_stock" as const, name: "" };
    await assert.rejects(add.execute({ ...cmd, email: "x@example.com", symbol: "005930" }), KrStockNotAvailableError);
    await assert.rejects(add.execute({ ...cmd, email: OWNER, symbol: "999999" }), KrStockNotAvailableError);
  });
});

describe("ListWatchlist — 국내 주식", () => {
  const row = (o: Partial<WatchlistItem>): WatchlistItem => ({
    id: "w",
    userId: "u1",
    assetType: "kr_stock",
    symbol: "005930",
    name: "삼성전자",
    currentPrice: 1,
    priceChange24h: 0,
    lastUpdated: new Date("2026-10-01T00:00:00Z"),
    addedAt: new Date("2026-10-01T00:00:00Z"),
    ...o,
  });
  const assets = { findQuotes: async () => [] } as never;

  it("국내 주식 시세는 kr_stock_quotes 에서 · 로고는 시세표와 같은 규칙(krStockLogoUrl)", async () => {
    const w = fakeWatchlist([row({})]);
    const { store } = storeWith([quote("005930", { price: 269_000.4, changeRate: 0.19 })]);
    const r = await new ListWatchlist(w.repo, assets, { store, viewerEmails: [OWNER] }).execute("u1", {}, { email: OWNER });
    assert.equal(r.items[0]!.currentPrice, 269_000);
    assert.equal(r.items[0]!.priceChange24h, 0.19);
    assert.deepEqual(r.items[0]!.priceUpdatedAt, new Date("2026-10-08T01:00:00Z"));
    assert.match(r.items[0]!.logoUrl ?? "", /^https:\/\/financialmodelingprep\.com\/image-stock\/005930\.K[SQ]\.png$/);
  });

  it("비소유자에게는 국내 주식 행을 빼고 센다", async () => {
    const w = fakeWatchlist([row({}), row({ id: "c", assetType: "crypto", symbol: "BTC" })]);
    const { store } = storeWith([]);
    const r = await new ListWatchlist(w.repo, assets, { store, viewerEmails: [OWNER] }).execute(
      "u1",
      {},
      { email: "x@example.com" }
    );
    assert.deepEqual(w.excluded(), ["kr_stock"]);
    assert.deepEqual(r.items.map((i) => i.assetType), ["crypto"]);
  });
});
