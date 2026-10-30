import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toErrorResponse } from "../../../shared/presentation/errorMiddleware";
import {
  canStartTracking,
  countTowardTrackingLimit,
  TrackedAssetLimitError,
  WatchlistDuplicateError,
  type ExchangeQuotePort,
  type HoldingProbe,
  type KrStockStore,
  type MarketAssetRepository,
  type MarketAssetType,
  type MarketAssetView,
  type StoredKrStockQuote,
  type WatchlistItem,
  type WatchlistRepository,
} from "../../domain";
import { AddToWatchlist, ListWatchlist } from "../ManageWatchlist";
import { SearchAssets } from "../SearchAssets";

/**
 * F000 FR-40 · 41 — 종목 검색(코인 + 국내) · 추적 자산 상한(`SRV-REQ-008` FR-80~87).
 */

const OWNER = "owner@example.com";

const row = (assetType: MarketAssetType, symbol: string, name = symbol): WatchlistItem => ({
  id: `w-${symbol}`,
  userId: "u1",
  assetType,
  symbol,
  name,
  currentPrice: null,
  priceChange24h: null,
  lastUpdated: null,
  addedAt: new Date("2026-10-30T00:00:00Z"),
});

const fakeWatchlist = (initial: WatchlistItem[]) => {
  const items = [...initial];
  const repo = {
    exists: async (_u: string, assetType: MarketAssetType, symbol: string) =>
      items.some((i) => i.assetType === assetType && i.symbol === symbol),
    add: async (input: { assetType: MarketAssetType; symbol: string; name: string }) => {
      const item = row(input.assetType, input.symbol, input.name);
      items.push(item);
      return item;
    },
    listAll: async () => [...items],
    findPage: async () => ({ items: [...items], total: items.length }),
    removeOwned: async () => true,
    distinctSymbols: async () => [],
    applyPrices: async () => 0,
  } as unknown as WatchlistRepository;
  return { repo, items };
};

const heldProbe = (held: Array<{ assetType: MarketAssetType; symbol: string }>): HoldingProbe => ({
  heldAssets: async () => held,
});

const coins = (n: number) => Array.from({ length: n }, (_, i) => row("crypto", `C${i}`));

const noExchange = {
  currentPrice: async () => {
    throw new Error("offline");
  },
} as unknown as ExchangeQuotePort;

const view = (symbol: string, koreanName: string, o: Partial<MarketAssetView> = {}): MarketAssetView => ({
  symbol,
  market: `KRW-${symbol}`,
  koreanName,
  englishName: symbol,
  currentPrice: 100,
  change24h: 1.5,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
  tradeValue24h: 0,
  logoUrl: `https://logo/${symbol}.png`,
  priceUpdatedAt: new Date("2026-10-30T00:00:00Z"),
  ...o,
});

describe("trackingLimit 정책", () => {
  it("보유 종목은 상한에 세지 않는다", () => {
    assert.equal(
      countTowardTrackingLimit(
        [{ assetType: "crypto", symbol: "BTC" }, { assetType: "crypto", symbol: "ETH" }],
        [{ assetType: "crypto", symbol: "btc" }]
      ),
      1
    );
  });

  it("상한에 닿아도 보유 종목은 담긴다 · 아니면 막힌다", () => {
    const watched = coins(10);
    const held = [{ assetType: "kr_stock" as const, symbol: "005930" }];
    assert.equal(canStartTracking({ candidate: held[0]!, watched, held, limit: 10 }), true);
    assert.equal(canStartTracking({ candidate: { assetType: "crypto", symbol: "NEW" }, watched, held, limit: 10 }), false);
    // 같은 심볼이어도 자산군이 다르면 다른 종목이다
    assert.equal(
      canStartTracking({ candidate: { assetType: "crypto", symbol: "005930" }, watched, held, limit: 10 }),
      false
    );
  });
});

describe("AddToWatchlist — 추적 상한", () => {
  it("관심 10개에서 11번째는 409 TRACKED_ASSET_LIMIT + 두 수", async () => {
    const w = fakeWatchlist(coins(10));
    const add = new AddToWatchlist(w.repo, noExchange, null, { held: heldProbe([]), limit: 10 });
    await assert.rejects(
      add.execute({ userId: "u1", assetType: "crypto", symbol: "xrp", name: "리플" }),
      (error: unknown) => {
        assert.ok(error instanceof TrackedAssetLimitError);
        const response = toErrorResponse(error);
        assert.equal(response.status, 409);
        assert.deepEqual(response.body, {
          trackedCount: 10,
          trackedLimit: 10,
          success: false,
          code: "TRACKED_ASSET_LIMIT",
          message: "Tracked asset limit reached",
        });
        return true;
      }
    );
    assert.equal(w.items.length, 10);
  });

  it("보유 종목은 관심 10개여도 담긴다 · 보유가 섞인 관심은 세지 않는다", async () => {
    const w = fakeWatchlist([...coins(9), row("crypto", "ETH")]);
    const add = new AddToWatchlist(w.repo, noExchange, null, {
      held: heldProbe([{ assetType: "crypto", symbol: "ETH" }, { assetType: "crypto", symbol: "SOL" }]),
      limit: 10,
    });
    await add.execute({ userId: "u1", assetType: "crypto", symbol: "sol", name: "솔라나" }); // 보유
    await add.execute({ userId: "u1", assetType: "crypto", symbol: "xrp", name: "리플" }); // ETH 는 보유라 9 → 10 번째
    await assert.rejects(
      add.execute({ userId: "u1", assetType: "crypto", symbol: "ada", name: "에이다" }),
      TrackedAssetLimitError
    );
  });

  it("이미 담긴 종목은 상한이 아니라 중복이다", async () => {
    const w = fakeWatchlist(coins(10));
    const add = new AddToWatchlist(w.repo, noExchange, null, { held: heldProbe([]), limit: 10 });
    await assert.rejects(
      add.execute({ userId: "u1", assetType: "crypto", symbol: "c0", name: "x" }),
      WatchlistDuplicateError
    );
  });

  it("상한은 설정값이다 — 3 이면 4번째가 막힌다", async () => {
    const w = fakeWatchlist(coins(3));
    const add = new AddToWatchlist(w.repo, noExchange, null, { held: heldProbe([]), limit: 3 });
    await assert.rejects(add.execute({ userId: "u1", assetType: "crypto", symbol: "z", name: "z" }), TrackedAssetLimitError);
  });
});

describe("ListWatchlist — 카운터", () => {
  it("tracked { count: 보유 제외 관심 수, limit } 를 싣는다", async () => {
    const w = fakeWatchlist([row("crypto", "BTC"), row("crypto", "ETH")]);
    const assets = { findQuotes: async () => [] } as unknown as MarketAssetRepository;
    const result = await new ListWatchlist(w.repo, assets, null, {
      held: heldProbe([{ assetType: "crypto", symbol: "BTC" }]),
      limit: 10,
    }).execute("u1");
    assert.deepEqual(result.tracked, { count: 1, limit: 10 });
    // 보유 종목은 ★ 해제를 막을 수 있게 표시한다(`FE-REQ-011` FR-7)
    assert.deepEqual(
      result.items.map((item) => [item.symbol, item.isHeld]),
      [
        ["BTC", true],
        ["ETH", false],
      ]
    );
  });
});

const krQuote = (code: string, price: number): StoredKrStockQuote =>
  ({ code, name: `종목${code}`, market: "KOSPI", price, changeRate: -1.25 }) as unknown as StoredKrStockQuote;

const krStore = (master: Array<{ code: string; name: string }>, quotes: StoredKrStockQuote[]) => {
  const searched: string[] = [];
  const store = {
    search: async (q: string) => {
      searched.push(q);
      return master.filter((m) => m.name.includes(q) || m.code.startsWith(q)).map((m) => ({ ...m, market: "KOSPI" }));
    },
    labels: async (codes: string[]) =>
      master
        .filter((m) => codes.includes(m.code))
        .map((m) => ({ code: m.code, name: m.name, market: "KOSPI", homepage: null, logoSource: null })),
    quotes: async ({ codes }: { codes?: string[] }) => quotes.filter((q) => codes?.includes(q.code)),
  } as unknown as KrStockStore;
  return { store, searched };
};

const assetsWith = (views: MarketAssetView[]) =>
  ({
    findAllActive: async ({ search }: { search?: string }) =>
      views.filter(
        (v) =>
          !search ||
          v.symbol.toLowerCase().includes(search.toLowerCase()) ||
          (v.koreanName ?? "").includes(search)
      ),
    findViews: async (symbols: string[]) => views.filter((v) => symbols.includes(v.symbol)),
  }) as unknown as MarketAssetRepository;

describe("SearchAssets", () => {
  const kr = krStore(
    [
      { code: "005930", name: "삼성전자" },
      { code: "005935", name: "삼성전자우" },
      { code: "000660", name: "SK하이닉스" },
    ],
    [krQuote("005930", 71_000.4)]
  );

  const search = (held: Array<{ assetType: MarketAssetType; symbol: string }> = [], watched: WatchlistItem[] = []) =>
    new SearchAssets(
      fakeWatchlist(watched).repo,
      assetsWith([view("BTC", "비트코인"), view("SAND", "샌드박스"), view("NEW", "신규", { priceUpdatedAt: null, currentPrice: 0 })]),
      { held: heldProbe(held), limit: 10 },
      { store: kr.store, viewerEmails: [OWNER] }
    );

  it("코인과 국내를 한 목록으로 — 같음 · 시작이 포함보다 앞", async () => {
    const result = await search().execute({ userId: "u1", email: OWNER, q: "삼성전자", limit: 20 });
    assert.deepEqual(
      result.items.map((i) => [i.assetType, i.symbol]),
      [
        ["kr_stock", "005930"],
        ["kr_stock", "005935"],
      ]
    );
    assert.equal(result.items[0]!.currentPrice, 71_000); // 원 단위
    assert.equal(result.items[1]!.currentPrice, null); // 유니버스 밖 — 0 이 아니다
    assert.deepEqual(result.tracked, { count: 0, limit: 10 });
  });

  it("심볼이 같으면 이름 포함보다 먼저 온다", async () => {
    const s = new SearchAssets(
      fakeWatchlist([]).repo,
      assetsWith([view("XSAND", "엑스샌드"), view("SAND", "샌드박스")]),
      { held: heldProbe([]), limit: 10 },
      null
    );
    const result = await s.execute({ userId: "u1", q: "sand", limit: 20 });
    assert.deepEqual(result.items.map((i) => i.symbol), ["SAND", "XSAND"]);
  });

  it("국내 주식은 소유자에게만 — 비소유자는 마스터를 읽지도 않는다", async () => {
    const before = kr.searched.length;
    const result = await search().execute({ userId: "u1", email: "other@example.com", q: "삼성", limit: 20 });
    assert.equal(result.items.length, 0);
    assert.equal(kr.searched.length, before);
  });

  it("isTracked = 관심 ∪ 보유, isHeld = 보유 · 시세가 안 들어온 코인은 null", async () => {
    const result = await search([{ assetType: "kr_stock", symbol: "000660" }], [row("crypto", "BTC")]).execute({
      userId: "u1",
      email: OWNER,
      q: "",
      limit: 20,
    });
    assert.deepEqual(
      result.items.map((i) => [i.symbol, i.isTracked, i.isHeld]),
      [
        ["BTC", true, false],
        ["000660", true, true],
      ]
    );
    assert.equal(result.items[1]!.name, "SK하이닉스");
    assert.equal(result.items[1]!.currentPrice, null);

    const fresh = await search().execute({ userId: "u1", q: "new", limit: 20, assetType: "crypto" });
    assert.equal(fresh.items[0]!.currentPrice, null);
    assert.equal(fresh.items[0]!.changeRate, null);
  });

  it("limit 을 넘기지 않는다", async () => {
    // 후보 둘(코인 SAND · 국내 SK하이닉스)에서 하나만
    const result = await search().execute({ userId: "u1", email: OWNER, q: "S", limit: 1 });
    assert.equal(result.items.length, 1);
  });
});

describe("loggableUrl — 검색어를 로그에 남기지 않는다(FR-86)", () => {
  it("q 값만 가린다", async () => {
    const { loggableUrl } = await import("../../../shared/presentation/loggerMiddleware");
    assert.equal(loggableUrl("/api/investment/search?q=%EC%82%BC%EC%84%B1&limit=20"), "/api/investment/search?q=*&limit=20");
    assert.equal(loggableUrl("/api/market/kr/search?q=005930"), "/api/market/kr/search?q=*");
    assert.equal(loggableUrl("/api/investment/watchlist?page=1"), "/api/investment/watchlist?page=1");
  });
});
