import type {
  ClosePoint,
  ExchangeQuotePort,
  FearGreedPort,
  IndicatorRepository,
  MarketAssetRepository,
  PriceHistoryRepository,
  SentimentRepository,
  StoredIndicator,
  StoredSentiment,
  StoredWhaleTransaction,
  SymbolNewsPort,
  WatchlistRepository,
  WhaleTransactionRepository,
} from "../../domain";
import {
  CalculateSentiment,
  GetSentimentHistory,
  ListWhaleTransactions,
  TrackSmartMoney,
} from "../AnalyzeMarketIntelligence";
import { GetSymbolNews } from "../GetSymbolNews";
import {
  AddToWatchlist,
  ListWatchlist,
  ListWatchlistSymbols,
  RemoveFromWatchlist,
  UpdateWatchlistPrices,
} from "../ManageWatchlist";
import {
  GetChartData,
  GetMarketOverview,
  GetRealTimePrice,
  ListMarketSymbols,
} from "../ReadMarketData";
import {
  CollectPriceHistory,
  SyncMarketListings,
  UpdateAllMarketPrices,
} from "../SyncMarketData";
import { RefreshTechnicalIndicators } from "../RefreshTechnicalIndicators";

/**
 * `market` 의 **공개 API** — 컨텍스트 밖으로 열리는 유일한 지점 (FR-4).
 *
 * ## 여기 있는 넷이 FR-32a 가 요구한 것이다
 *
 * `coach` 의 `market-regime` 이 기술 지표와 심리를, `ai-coach` 계열이 고래 거래를,
 * `portfolio` 의 성과 차트가 종가를 읽는다. 원문에서는 넷 다 **각자 `prisma` 를
 * 직접 뒤졌고**, 그래서 "최신 지표"의 정의가 파일마다 있었다.
 *
 * 조회 전용이다. 시세 갱신·수집처럼 **상태를 바꾸는 것은 열지 않는다** — 밖에서
 * 부를 일이 없고, 열면 다른 컨텍스트가 우리 워커를 대신 돌리게 된다.
 */
export interface MarketApi {
  /** 최신 기술 지표. 없으면 `null` — 신규 상장이나 캔들 부족이 정상 경로다. */
  latestIndicator(symbol: string): Promise<StoredIndicator | null>;
  /** 최신 시장 심리. 없으면 `null`. */
  latestSentiment(symbol: string): Promise<StoredSentiment | null>;
  recentWhaleTransactions(
    symbol: string,
    limit?: number
  ): Promise<StoredWhaleTransaction[]>;
  /** 여러 심볼의 종가를 한 번에. 심볼당 조회를 부르지 않게 하는 자리다. */
  closesSince(symbols: string[], since: Date): Promise<ClosePoint[]>;
}

export type {
  ClosePoint,
  StoredIndicator,
  StoredSentiment,
  StoredWhaleTransaction,
};

export interface MarketDependencies {
  assets: MarketAssetRepository;
  watchlist: WatchlistRepository;
  sentiments: SentimentRepository;
  whales: WhaleTransactionRepository;
  prices: PriceHistoryRepository;
  indicators: IndicatorRepository;
  exchange: ExchangeQuotePort;
  fearGreed: FearGreedPort;
  news: SymbolNewsPort;
}

export interface MarketUseCases {
  calculateSentiment: CalculateSentiment;
  trackSmartMoney: TrackSmartMoney;
  getSentimentHistory: GetSentimentHistory;
  listWhaleTransactions: ListWhaleTransactions;
  getSymbolNews: GetSymbolNews;
  addToWatchlist: AddToWatchlist;
  listWatchlist: ListWatchlist;
  removeFromWatchlist: RemoveFromWatchlist;
  listWatchlistSymbols: ListWatchlistSymbols;
  updateWatchlistPrices: UpdateWatchlistPrices;
  getMarketOverview: GetMarketOverview;
  getRealTimePrice: GetRealTimePrice;
  getChartData: GetChartData;
  listMarketSymbols: ListMarketSymbols;
  syncMarketListings: SyncMarketListings;
  updateAllMarketPrices: UpdateAllMarketPrices;
  collectPriceHistory: CollectPriceHistory;
  refreshTechnicalIndicators: RefreshTechnicalIndicators;
}

export const createMarketApplication = (deps: MarketDependencies) => {
  const useCases: MarketUseCases = {
    calculateSentiment: new CalculateSentiment(
      deps.exchange,
      deps.fearGreed,
      deps.sentiments
    ),
    trackSmartMoney: new TrackSmartMoney(deps.exchange, deps.whales),
    getSentimentHistory: new GetSentimentHistory(deps.sentiments),
    listWhaleTransactions: new ListWhaleTransactions(deps.whales),
    getSymbolNews: new GetSymbolNews(deps.news),
    addToWatchlist: new AddToWatchlist(deps.watchlist, deps.exchange),
    listWatchlist: new ListWatchlist(deps.watchlist),
    removeFromWatchlist: new RemoveFromWatchlist(deps.watchlist),
    listWatchlistSymbols: new ListWatchlistSymbols(deps.watchlist),
    updateWatchlistPrices: new UpdateWatchlistPrices(deps.watchlist),
    getMarketOverview: new GetMarketOverview(deps.assets, deps.exchange),
    getRealTimePrice: new GetRealTimePrice(deps.exchange),
    getChartData: new GetChartData(deps.exchange),
    listMarketSymbols: new ListMarketSymbols(deps.assets),
    syncMarketListings: new SyncMarketListings(deps.assets, deps.exchange),
    updateAllMarketPrices: new UpdateAllMarketPrices(deps.assets, deps.exchange),
    collectPriceHistory: new CollectPriceHistory(
      deps.assets,
      deps.exchange,
      deps.prices
    ),
    refreshTechnicalIndicators: new RefreshTechnicalIndicators(
      deps.assets,
      deps.prices,
      deps.indicators
    ),
  };

  const api: MarketApi = {
    latestIndicator: (symbol) => deps.indicators.findLatest(symbol),
    latestSentiment: (symbol) => deps.sentiments.findLatest(symbol),
    recentWhaleTransactions: (symbol, limit = 20) =>
      deps.whales.findRecent(symbol, limit),
    closesSince: (symbols, since) => deps.prices.closesSince(symbols, since),
  };

  return { api, useCases };
};
