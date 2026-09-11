import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SentimentLabel } from "../../domain";
import type {
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
}) =>
  createMarketApplication({
    assets: {} as MarketAssetRepository,
    watchlist: deps.watchlist ?? ({} as WatchlistRepository),
    sentiments: deps.sentiments ?? captureSentiment().repo,
    whales:
      deps.whales ??
      ({ saveMany: async () => {}, findRecent: async () => [] } as WhaleTransactionRepository),
    prices: {} as PriceHistoryRepository,
    indicators: {} as IndicatorRepository,
    exchange: deps.exchange ?? stubExchange(),
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
        },
        findRecent: async () => [],
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
