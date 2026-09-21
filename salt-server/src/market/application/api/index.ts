import type {
  AssetQuote,
  ClosePercentiles,
  ClosePoint,
  ExchangeQuotePort,
  FearGreedPort,
  IndicatorRepository,
  MarketAssetRepository,
  PriceHistoryRepository,
  PriceTimeframe,
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
  BackfillDailyHistory,
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

  /**
   * ## 아래 여섯은 `coach` 통합(FR-32)이 요구한 것이다
   *
   * 전부 **여러 심볼을 한 번에** 받는다. 원문의 코치는 심볼마다 조회를 돌리거나
   * (`N+1`) 우리 테이블을 밖에서 직접 뒤졌다 — `technicalIndicator` 의 `distinct`
   * 조회와 `marketAsset.currentPrice` 가 `ai-coach-feature.extractor` 안에 있었다.
   */
  latestIndicators(
    symbols: string[],
    timeframe?: string
  ): Promise<StoredIndicator[]>;
  latestSentiments(symbols: string[]): Promise<StoredSentiment[]>;
  /** 저장된 시세와 **그 값의 나이**. 신선도 판정은 부르는 쪽이 한다. */
  assetQuotes(symbols: string[]): Promise<AssetQuote[]>;
  /** `limit` 은 심볼별이 아니라 전체다 (원문의 `take: 100`). */
  recentWhalesForSymbols(
    symbols: string[],
    limit?: number
  ): Promise<StoredWhaleTransaction[]>;
  /** `since` 이후 5분봉 최고 종가. 추격 매수 판정의 기준선이다. */
  highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Array<{ symbol: string; close: number }>>;
  /** `at` 이후 첫 종가. 성적표의 진입가다. */
  closeAtOrAfter(symbol: string, at: Date): Promise<number | null>;
  latestCloses(symbols: string[]): Promise<ClosePoint[]>;
  /**
   * 한 심볼의 종가 백분위. `coach` 의 관찰 구간(F004 · D2)이 쓴다 — 가격 목표가 아니라
   * 과거 분포다.
   */
  closePercentiles(
    symbol: string,
    timeframe: PriceTimeframe,
    since: Date,
    fractions: number[]
  ): Promise<ClosePercentiles>;
  /**
   * 누군가의 관심 목록에 있는 크립토 심볼 전체 — **사용자를 구분하지 않는다.**
   * `coach` 의 종목 판단 스냅샷(F004 · D11)이 추적 자산을 만들 때 쓴다.
   */
  watchedSymbols(): Promise<string[]>;
}

export type {
  AssetQuote,
  ClosePercentiles,
  ClosePoint,
  PriceTimeframe,
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
  backfillDailyHistory: BackfillDailyHistory;
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
    // 관심 목록이 자산 표를 함께 읽는다 — 행에 가격이 없거나 오래된 심볼을 보정한다
    // (`SRV-REQ-008` FR-33). 두 리포지토리 다 이 컨텍스트 것이라 경계를 넘지 않는다.
    listWatchlist: new ListWatchlist(deps.watchlist, deps.assets),
    removeFromWatchlist: new RemoveFromWatchlist(deps.watchlist),
    listWatchlistSymbols: new ListWatchlistSymbols(deps.watchlist),
    updateWatchlistPrices: new UpdateWatchlistPrices(deps.watchlist),
    getMarketOverview: new GetMarketOverview(
      deps.assets,
      deps.exchange,
      deps.prices
    ),
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
    backfillDailyHistory: new BackfillDailyHistory(
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
    latestIndicators: (symbols, timeframe) =>
      deps.indicators.findLatestMany(symbols, timeframe),
    latestSentiments: (symbols) => deps.sentiments.findLatestMany(symbols),
    assetQuotes: (symbols) => deps.assets.findQuotes(symbols),
    recentWhalesForSymbols: (symbols, limit = 100) =>
      deps.whales.findRecentForSymbols(symbols, limit),
    highestCloseSince: (symbols, since) =>
      deps.prices.highestCloseSince(symbols, since),
    closeAtOrAfter: (symbol, at) => deps.prices.closeAtOrAfter(symbol, at),
    latestCloses: (symbols) => deps.prices.latestCloses(symbols),
    closePercentiles: (symbol, timeframe, since, fractions) =>
      deps.prices.closePercentiles(symbol, timeframe, since, fractions),
    watchedSymbols: () => deps.watchlist.distinctSymbols("crypto"),
  };

  return { api, useCases };
};
