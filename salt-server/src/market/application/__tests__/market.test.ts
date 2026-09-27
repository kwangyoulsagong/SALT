import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SentimentLabel } from "../../domain";
import type {
  AssetQuote,
  ExchangeQuotePort,
  FearGreedPort,
  IndicatorRepository,
  MarketAssetRepository,
  PriceHistoryRepository,
  Quote,
  SentimentRecord,
  SentimentRepository,
  StoredSentiment,
  SymbolNewsPort,
  Trade,
  TradeHistoryPort,
  WatchlistItem,
  WatchlistRepository,
  WhaleTransactionRepository,
} from "../../domain";
import { createMarketApplication } from "../api";

const quote = (overrides: Partial<Quote> = {}): Quote => ({
  symbol: "BTC",
  market: "KRW-BTC",
  currentPrice: 100,
  change24h: 0,
  high24h: 110,
  low24h: 90,
  volume24h: 7, // 체결 **수량**
  tradeValue24h: 700, // 체결 **대금**
  timestamp: new Date("2026-09-11T00:00:00Z"),
  ...overrides,
});

const stubExchange = (overrides: Partial<ExchangeQuotePort> = {}) =>
  ({
    currentPrice: async () => quote(),
    currentPrices: async () => [],
    dailyCandles: async () => [],
    minuteCandles: async () => [],
    dailyTradeValues: async () => [700, 700, 700, 700, 700, 700, 700],
    candlesByTimeframe: async () => [],
    krwMarkets: async () => [],
    recentTrades: async () => [],
    orderbookPressure: async () => ({ bids: 100, asks: 100 }),
    ...overrides,
  }) as ExchangeQuotePort;

const captureSentiment = () => {
  const saved: SentimentRecord[] = [];
  const repo: SentimentRepository = {
    save: async (record) => {
      saved.push(record);
      return {
        ...record,
        id: "s1",
        calculatedAt: new Date("2026-09-11T00:00:00Z"),
      } as StoredSentiment;
    },
    findLatest: async () => null,
    findHistorySince: async () => [],
  };
  return { saved, repo };
};

const build = (deps: {
  exchange?: ExchangeQuotePort;
  sentiments?: SentimentRepository;
  whales?: WhaleTransactionRepository;
  fearGreed?: FearGreedPort;
  news?: SymbolNewsPort;
  watchlist?: WatchlistRepository;
  assets?: MarketAssetRepository;
  trades?: TradeHistoryPort;
}) =>
  createMarketApplication({
    assets: deps.assets ?? ({} as MarketAssetRepository),
    watchlist: deps.watchlist ?? ({} as WatchlistRepository),
    sentiments: deps.sentiments ?? captureSentiment().repo,
    whales:
      deps.whales ??
      ({ saveMany: async () => {}, findRecent: async () => [] } as WhaleTransactionRepository),
    prices: {} as PriceHistoryRepository,
    indicators: {} as IndicatorRepository,
    exchange: deps.exchange ?? stubExchange(),
    trades: deps.trades ?? { tradesSince: async () => ({ trades: [], truncated: false }) },
    fearGreed: deps.fearGreed ?? { current: async () => null },
    news: deps.news ?? { recent: async () => [] },
  });

describe("CalculateSentiment", () => {
  /**
   * **이관에서 가장 틀리기 쉬운 배선이다.**
   *
   * 원문의 `market-intelligence.service` 는 axios 를 직접 불러 `acc_trade_price_24h`
   * (체결 **대금**)를 거래량 점수에 넣었고, 같은 레포의 `UpbitService` 는 `volume24h`
   * 에 `acc_trade_volume_24h`(체결 **수량**)를 담았다. 두 클라이언트를 하나로 합치면서
   * 둘 중 아무거나 꽂으면 점수가 조용히 달라진다 — 수량과 대금은 자릿수가 다르다.
   */
  it("거래량 점수와 저장 값에 체결 **대금**을 쓴다 (수량이 아니다)", async () => {
    const { saved, repo } = captureSentiment();
    const { useCases } = build({ sentiments: repo });

    const result = await useCases.calculateSentiment.execute("BTC");

    assert.equal(saved.length, 1);
    assert.equal(saved[0].volume24h, 700);
    // 평균 대금(700)과 같으므로 거래량 점수는 중립 50 이다
    assert.equal(result.components.volume, 50);
  });

  it("Fear&Greed 조회가 실패해도 점수를 낸다", async () => {
    const { useCases } = build({
      fearGreed: { current: async () => null },
    });

    const result = await useCases.calculateSentiment.execute("BTC");

    assert.equal(result.components.fearGreed, undefined);
    assert.ok(Object.values(SentimentLabel).includes(result.sentimentLabel));
  });
});

describe("TrackSmartMoney", () => {
  it("5천만원 미만 체결은 고래로 세지 않는다", async () => {
    const saved: unknown[] = [];
    const { useCases } = build({
      exchange: stubExchange({
        recentTrades: async () => [
          { side: "buy", price: 50_000_000, volume: 1 }, // 5천만 — 포함
          { side: "buy", price: 10_000_000, volume: 1 }, // 1천만 — 제외
          { side: "sell", price: 100_000_000, volume: 2 }, // 2억 — 포함
        ],
      }),
      whales: {
        saveMany: async (records) => {
          saved.push(...records);
          return records.length;
        },
        latestTradedAt: async () => new Map(),
        findRecent: async () => [],
        findRecentForSymbols: async () => [],
      },
    });

    const result = await useCases.trackSmartMoney.execute("BTC");

    assert.equal(result.signals.largeTrades, 2);
    assert.equal(result.signals.largeBuys, 1);
    assert.equal(result.signals.largeSells, 1);
    assert.equal(saved.length, 2);
    // 매수 1 · 매도 1 → 체결 점수 0, 호가 균형 → 0
    assert.equal(result.smartMoneyIndex.score, 0);
  });
});

describe("CollectWhaleTrades", () => {
  const trade = (seq: number, krw: number, side: Trade["side"] = "buy"): Trade => ({
    side,
    price: krw,
    volume: 1,
    tradedAt: new Date(Date.UTC(2026, 8, 29, 1, 0, seq)),
    sequentialId: seq,
  });

  it("상위 · 관심 종목을 합쳐 마지막 저장 체결 뒤부터 받고, 5천만원 이상을 전부 저장한다", async () => {
    const asked: Array<[string, Date]> = [];
    const saved: unknown[] = [];
    const last = new Date(Date.now() - 10 * 60_000); // 10분 전 — 1시간 안이라 그대로 쓴다
    const { useCases } = build({
      assets: { topByTradeValue: async () => ["BTC", "ETH"] } as unknown as MarketAssetRepository,
      watchlist: { distinctSymbols: async () => ["ETH", "XRP"] } as unknown as WatchlistRepository,
      whales: {
        saveMany: async (records) => {
          saved.push(...records);
          return records.length;
        },
        latestTradedAt: async () => new Map([["BTC", last]]),
        findRecent: async () => [],
        findRecentForSymbols: async () => [],
      },
      trades: {
        tradesSince: async (symbol, since) => {
          asked.push([symbol, since]);
          return {
            trades: symbol === "BTC" ? [trade(1, 60_000_000), trade(2, 10_000_000), trade(3, 90_000_000, "sell")] : [],
            truncated: symbol === "XRP",
          };
        },
      },
    });

    const result = await useCases.collectWhaleTrades.execute();

    assert.deepEqual(asked.map(([s]) => s), ["BTC", "ETH", "XRP"]); // 겹치는 ETH 는 한 번
    assert.equal(asked[0][1], last); // 저장된 마지막 체결 뒤부터
    assert.equal(result.saved, 2); // 1천만원 체결 제외 — 상한 없이 전부
    assert.deepEqual(result.truncated, ["XRP"]);
    const first = saved[0] as { tradedAt: Date; sequentialId: number };
    assert.equal(first.sequentialId, 1); // 발생 시각 · 체결 id 가 행에 남는다
    assert.ok(first.tradedAt instanceof Date);
  });

  it("다음 회차는 지난 회차에 훑은 마지막 체결 뒤부터 — 대형 체결 시각이 아니다", async () => {
    const asked: Date[] = [];
    const { useCases } = build({
      assets: { topByTradeValue: async () => ["BTC"] } as unknown as MarketAssetRepository,
      watchlist: { distinctSymbols: async () => [] } as unknown as WatchlistRepository,
      whales: {
        saveMany: async (records) => records.length,
        latestTradedAt: async () => new Map([["BTC", new Date("2020-01-01T00:00:00Z")]]),
        findRecent: async () => [],
        findRecentForSymbols: async () => [],
      },
      trades: {
        tradesSince: async (_symbol, since) => {
          asked.push(since);
          return { trades: [trade(5, 1_000), trade(7, 2_000)], truncated: false }; // 작은 체결만
        },
      },
    });

    await useCases.collectWhaleTrades.execute();
    await useCases.collectWhaleTrades.execute();

    // 재기동 뒤 첫 회차 — 저장된 대형 체결이 너무 오래됐으면 1시간 전까지만
    assert.ok(Date.now() - asked[0].getTime() <= 3600_000 + 5_000);
    assert.equal(asked[1].toISOString(), trade(7, 0).tradedAt.toISOString()); // 훑은 마지막 체결
  });

  it("한 종목 실패가 수집 전체를 멈추지 않는다", async () => {
    const { useCases } = build({
      assets: { topByTradeValue: async () => ["BTC", "ETH"] } as unknown as MarketAssetRepository,
      watchlist: { distinctSymbols: async () => [] } as unknown as WatchlistRepository,
      whales: {
        saveMany: async (records) => records.length,
        latestTradedAt: async () => new Map(),
        findRecent: async () => [],
        findRecentForSymbols: async () => [],
      },
      trades: {
        tradesSince: async (symbol) => {
          if (symbol === "BTC") throw new Error("429");
          return { trades: [trade(9, 70_000_000)], truncated: false };
        },
      },
    });

    const result = await useCases.collectWhaleTrades.execute();

    assert.deepEqual(result.failed, ["BTC"]);
    assert.equal(result.saved, 1);
  });
});

describe("AddToWatchlist", () => {
  it("시세 조회가 실패해도 가격 없이 추가한다", async () => {
    let added: { currentPrice: number | null } | null = null;

    const { useCases } = build({
      exchange: stubExchange({
        currentPrice: async () => {
          throw new Error("upbit down");
        },
      }),
      watchlist: {
        exists: async () => false,
        add: async (input) => {
          added = input as any;
          return { ...input, id: "w1", lastUpdated: null, addedAt: new Date() } as any;
        },
        findPage: async () => ({ items: [], total: 0 }),
        removeOwned: async () => true,
        distinctSymbols: async () => [],
        applyPrices: async () => 0,
      } as WatchlistRepository,
    });

    await useCases.addToWatchlist.execute({
      userId: "u1",
      assetType: "crypto",
      symbol: "btc",
      name: "비트코인",
    });

    assert.equal(added!.currentPrice, null);
  });

  it("심볼을 대문자로 정규화한다", async () => {
    let seen = "";
    const { useCases } = build({
      watchlist: {
        exists: async (_u, _a, symbol) => {
          seen = symbol;
          return false;
        },
        add: async (input) => ({ ...input, id: "w1" }) as any,
        findPage: async () => ({ items: [], total: 0 }),
        removeOwned: async () => true,
        distinctSymbols: async () => [],
        applyPrices: async () => 0,
      } as WatchlistRepository,
    });

    await useCases.addToWatchlist.execute({
      userId: "u1",
      assetType: "crypto",
      symbol: "btc",
      name: "비트코인",
    });

    assert.equal(seen, "BTC");
  });
});

describe("ListWatchlist", () => {
  const watchlistRow = (
    overrides: Partial<WatchlistItem> = {}
  ): WatchlistItem => ({
    id: "w1",
    userId: "u1",
    assetType: "crypto",
    symbol: "BTC",
    name: "비트코인",
    currentPrice: 100,
    priceChange24h: 1,
    lastUpdated: new Date("2026-09-18T00:00:00Z"),
    addedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  });

  const stubWatchlist = (items: WatchlistItem[]): WatchlistRepository =>
    ({
      exists: async () => false,
      add: async (input) => ({ ...input, id: "w1" }) as WatchlistItem,
      findPage: async () => ({ items, total: items.length }),
      removeOwned: async () => true,
      distinctSymbols: async () => [],
      applyPrices: async () => 0,
    }) as WatchlistRepository;

  const stubAssets = (quotes: AssetQuote[]) => {
    let asked: string[] | null = null;
    const repo = {
      findQuotes: async (symbols: string[]) => {
        asked = symbols;
        return quotes;
      },
    } as MarketAssetRepository;
    return { repo, asked: () => asked };
  };

  it("행에 가격이 없으면 자산 표의 저장 시세로 채운다", async () => {
    const assets = stubAssets([
      {
        symbol: "BTC",
        currentPrice: 158_000_000,
        change24h: -1.23,
        assetType: "crypto",
        priceUpdatedAt: new Date("2026-09-18T02:00:00Z"),
      },
    ]);
    const { useCases } = build({
      watchlist: stubWatchlist([
        watchlistRow({ currentPrice: null, priceChange24h: null, lastUpdated: null }),
      ]),
      assets: assets.repo,
    });

    const result = await useCases.listWatchlist.execute("u1");

    assert.deepEqual(assets.asked(), ["BTC"]);
    assert.equal(result.items[0].currentPrice, 158_000_000);
    assert.equal(result.items[0].priceChange24h, -1.23);
  });

  /** 둘 다 값이 있으면 **시각이 늦은 쪽**이 이긴다. 출처가 둘인 것이 전제다. */
  it("행이 자산 표보다 최신이면 행의 값을 쓴다", async () => {
    const assets = stubAssets([
      {
        symbol: "BTC",
        currentPrice: 1,
        change24h: 0,
        assetType: "crypto",
        priceUpdatedAt: new Date("2026-09-17T00:00:00Z"),
      },
    ]);
    const { useCases } = build({
      watchlist: stubWatchlist([
        watchlistRow({
          currentPrice: 999,
          lastUpdated: new Date("2026-09-18T00:00:00Z"),
        }),
      ]),
      assets: assets.repo,
    });

    const result = await useCases.listWatchlist.execute("u1");

    assert.equal(result.items[0].currentPrice, 999);
  });

  it("두 출처 다 가격이 없으면 null 이다 — 0 으로 떨어뜨리지 않는다", async () => {
    const assets = stubAssets([
      {
        symbol: "BTC",
        currentPrice: null,
        change24h: null,
        assetType: "crypto",
        priceUpdatedAt: null,
      },
    ]);
    const { useCases } = build({
      watchlist: stubWatchlist([
        watchlistRow({ currentPrice: null, priceChange24h: null, lastUpdated: null }),
      ]),
      assets: assets.repo,
    });

    const result = await useCases.listWatchlist.execute("u1");

    assert.equal(result.items[0].currentPrice, null);
    assert.equal(result.items[0].priceChange24h, null);
  });

  it("목록이 비면 자산 표를 부르지 않는다", async () => {
    const assets = stubAssets([]);
    const { useCases } = build({
      watchlist: stubWatchlist([]),
      assets: assets.repo,
    });

    const result = await useCases.listWatchlist.execute("u1");

    assert.equal(assets.asked(), null);
    assert.deepEqual(result.items, []);
    assert.equal(result.pagination.total, 0);
  });

  /** 응답에 `userId` 를 담지 않는다 — 원문은 행을 그대로 펼쳐 내보냈다. */
  it("뷰에 userId 가 없고 크립토에 logoUrl 이 붙는다", async () => {
    const assets = stubAssets([]);
    const { useCases } = build({
      watchlist: stubWatchlist([watchlistRow()]),
      assets: assets.repo,
    });

    const result = await useCases.listWatchlist.execute("u1");

    assert.equal("userId" in result.items[0], false);
    assert.equal(
      result.items[0].logoUrl,
      "https://static.upbit.com/logos/BTC.png"
    );
  });

  /** 로고 URL 은 업비트 CDN 규칙이다. 주식에 붙이면 404 를 화면이 그린다. */
  it("주식은 logoUrl 이 null 이다", async () => {
    const assets = stubAssets([]);
    const { useCases } = build({
      watchlist: stubWatchlist([
        watchlistRow({ assetType: "stock", symbol: "AAPL", name: "애플" }),
      ]),
      assets: assets.repo,
    });

    const result = await useCases.listWatchlist.execute("u1");

    assert.equal(result.items[0].logoUrl, null);
  });
});

describe("GetSymbolNews", () => {
  it("news 컨텍스트를 Port 로만 부르고 기사가 없으면 status 가 empty 다", async () => {
    let asked: { symbol: string; limit: number } | null = null;
    const { useCases } = build({
      news: {
        recent: async (symbol, limit) => {
          asked = { symbol, limit };
          return [];
        },
      },
    });

    const result = await useCases.getSymbolNews.execute("btc");

    assert.deepEqual(asked, { symbol: "BTC", limit: 3 });
    assert.equal(result.status, "empty");
    assert.equal(result.symbol, "BTC");
  });
});
