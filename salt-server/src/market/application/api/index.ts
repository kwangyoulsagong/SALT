import { KrStockDisabledError, KrStockNotAvailableError, isKrStockCode, isKrStockViewer } from "../../domain";
import type { KrCompanyHomepageSource, KrHeldCodesSource, KrLogoImageProbe } from "../../domain";
import type {
  KrProviderHealthPort,
  KrRealtimePort,
  KrMarketCalendarStore,
  KrStockMasterSource,
  KrStockQuotePort,
  KrStockStore,
} from "../../domain";
import type {
  AssetQuote,
  ClosePercentiles,
  ClosePoint,
  ExchangeQuotePort,
  TradeHistoryPort,
  FearGreedPort,
  MarketSummaryPolicy,
  IndicatorRepository,
  MarketAssetRepository,
  PriceHistoryRepository,
  PriceTimeframe,
  SentimentForwardReturn,
  SentimentForwardReturnQuery,
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
  CollectWhaleTrades,
} from "../AnalyzeMarketIntelligence";
import { GetSymbolNews } from "../GetSymbolNews";
import { ResolveKrStockLogos } from "../ResolveKrStockLogos";
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
import { GetMarketSummary } from "../GetMarketSummary";
import {
  BackfillDailyHistory,
  CollectPriceHistory,
  SyncMarketListings,
  UpdateAllMarketPrices,
} from "../SyncMarketData";
import { RefreshTechnicalIndicators } from "../RefreshTechnicalIndicators";
import {
  GetKrMarketSession,
  GetKrStockChart,
  GetKrStockDetail,
  ListKrStockQuotes,
  SearchKrStocks,
} from "../ReadKrStock";
import { RunKrRealtime } from "../RunKrRealtime";
import {
  PollKrStockQuotes,
  ReportKrProviderMetrics,
  SyncKrMinuteBars,
  ResolveKrStockUniverse,
  SyncKrDailyCandles,
  SyncKrMarketCalendar,
  SyncKrStockMaster,
} from "../SyncKrStock";

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
  /**
   * 저장된 시세와 **그 값의 나이**. 신선도 판정은 부르는 쪽이 한다.
   * 국내 주식 코드는 `kr_stock_quotes` 에서 같은 모양으로 온다(F011 슬라이스 4 — 코치 판단 재료). 꺼져 있으면 빠진다
   */
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
  /** `at` 이후 첫 종가 — 주기 필수. 성적표 · 월초 평가의 기준가다. */
  closeAtOrAfter(symbol: string, at: Date, timeframe: PriceTimeframe): Promise<number | null>;
  /** `at` 이전 마지막 종가(`notBefore` 보다 오래된 봉 제외) — 국내 주식 거래일 채점(F011 FR-64) */
  closeAtOrBefore(
    symbol: string,
    at: Date,
    timeframe: PriceTimeframe,
    notBefore: Date
  ): Promise<{ close: number; timestamp: Date } | null>;
  /** 심볼별 봉 수 — 국내 주식 코치 해제 조건(일봉 120 거래일, F011 FR-62) */
  candleCounts(symbols: string[], timeframe: PriceTimeframe): Promise<Map<string, number>>;
  /** `[from, to]` 5분봉 최고 종가. 5분봉은 30일 보관이라 그보다 오래된 구간은 `null` */
  highestCloseBetween(symbol: string, from: Date, to: Date): Promise<number | null>;
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
   * 심리 구간별 사후 수익률 분포. `coach` 의 게이지 적중률(F004 · B9)이 일 1회 읽는다.
   * 심리와 종가가 둘 다 `market` 의 것이라 합치는 것도 여기서 한다.
   */
  sentimentForwardReturns(
    query: SentimentForwardReturnQuery
  ): Promise<SentimentForwardReturn[]>;
  /**
   * 누군가의 관심 목록에 있는 크립토 심볼 전체 — **사용자를 구분하지 않는다.**
   * `coach` 의 종목 판단 스냅샷(F004 · D11)이 추적 자산을 만들 때 쓴다.
   */
  watchedSymbols(): Promise<string[]>;
  /**
   * 국내 주식 판단 대상 = 시세를 모으는 유니버스(보유 → 관심 → 시총 상위, F011 FR-11). 꺼져 있으면 빈 배열.
   * 재료(시세 · 일봉 · 지표)가 있는 종목만 판단한다 — 관심 · 보유만 보면 장기 표본 20 이 몇 년 걸린다
   */
  krJudgmentUniverse(): Promise<string[]>;
  /**
   * 거래 기록이 국내 주식 코드를 받기 전 확인(F011 슬라이스 3b) — 꺼져 있으면 `KrStockDisabledError`(503),
   * 비소유자 · 코드 형식 · 마스터에 없음은 같은 `KrStockNotAvailableError`(404 — 관심 종목 추가와 같은 규칙).
   * 통과하면 마스터 이름
   */
  krStockListing(email: string | undefined, code: string): Promise<{ code: string; name: string }>;
  /** 저장된 국내 주식 현재가(`kr_stock_quotes`). 꺼져 있거나 시세가 없는 코드는 빠진다 — 보유 평가가 쓴다 */
  krStockPrices(codes: string[]): Promise<Array<{ code: string; price: number; priceUpdatedAt: Date }>>;
}

export type {
  AssetQuote,
  ClosePercentiles,
  ClosePoint,
  PriceTimeframe,
  SentimentForwardReturn,
  SentimentForwardReturnQuery,
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
  trades: TradeHistoryPort;
  fearGreed: FearGreedPort;
  news: SymbolNewsPort;
  /** 시장 요약 띠의 종목 · 임계 — 설정값(`MARKET_SUMMARY_*`)이다 */
  summaryPolicy: MarketSummaryPolicy;
  /**
   * 국내 주식(F011). **KIS 키가 없으면 `null`** — 워커가 등록되지 않고 경로는 503 이다(FR-6).
   * 코인 의존과 묶지 않는다: KIS 장애 · 미설정이 코인 시세를 막지 않는다
   */
  krStock: KrStockDependencies | null;
}

export interface KrStockDependencies {
  kis: KrStockQuotePort;
  master: KrStockMasterSource;
  store: KrStockStore;
  calendar: KrMarketCalendarStore;
  /** WS 실시간 체결(슬라이스 1) — 앱 키당 세션 하나라 프로세스에 하나 */
  realtime: KrRealtimePort;
  /** KIS REST 건강 상태 · 지표(FR-92 · 94) — `KisClient` 가 호출 결과로 센다 */
  health: KrProviderHealthPort;
  /** 보유 코드 — 유니버스 첫 순위(FR-11). `portfolio` 의 사실이라 조립 지점이 넣는다 */
  held: KrHeldCodesSource;
  /** 시총 상위 N(`KIS_UNIVERSE_TOP_N`) */
  universeTopN: number;
  /** logo.dev 퍼블리셔블 키(`KR_LOGO_DEV_TOKEN`) — 없으면 로고 없음(화면 이니셜, `krStockLogoUrl`) */
  logoDevToken?: string;
  /** 로고 이미지 받기 — 선명도 판정(`ResolveKrStockLogos`) */
  logoImages: KrLogoImageProbe;
  /** DART 기업개황 홈페이지 — 키(`DART_API_KEY`)가 없으면 `null`(도메인 조회 없이 티커만) */
  homepages: KrCompanyHomepageSource | null;
  /** 볼 수 있는 계정 — 소유자 전용(`FORECAST_OWNER_EMAILS`) */
  viewerEmails: readonly string[];
}

export interface KrStockUseCases {
  syncMaster: SyncKrStockMaster;
  syncCalendar: SyncKrMarketCalendar;
  syncDailyCandles: SyncKrDailyCandles;
  pollQuotes: PollKrStockQuotes;
  syncMinuteBars: SyncKrMinuteBars;
  realtime: RunKrRealtime;
  reportMetrics: ReportKrProviderMetrics;
  /** 종목별 로고 출처 판정(도메인 → 티커 → 없음) — 하루 한 번 · 30일마다 다시 */
  resolveLogos: ResolveKrStockLogos;
  /** SSE 를 열기 전 소유자 판정 — 스트림도 시세다 */
  assertViewer: (viewer: { userId: string; email?: string }) => void;
  getSession: GetKrMarketSession;
  listQuotes: ListKrStockQuotes;
  getDetail: GetKrStockDetail;
  getChart: GetKrStockChart;
  search: SearchKrStocks;
}

const createKrStockUseCases = (deps: KrStockDependencies): KrStockUseCases => {
  const universe = new ResolveKrStockUniverse(deps.store, deps.held, deps.universeTopN);
  const realtime = new RunKrRealtime(deps.realtime, deps.store, deps.calendar, universe);
  const provider = () => {
    const h = deps.health.snapshot();
    return {
      status: h.status,
      since: h.since?.toISOString() ?? null,
      lastSuccessAt: h.lastSuccessAt?.toISOString() ?? null,
      realtime: realtime.status(),
    };
  };
  const read = {
    store: deps.store,
    calendar: deps.calendar,
    viewerEmails: deps.viewerEmails,
    provider,
    logoDevToken: deps.logoDevToken,
  };
  return {
    syncMaster: new SyncKrStockMaster(deps.master, deps.store),
    syncCalendar: new SyncKrMarketCalendar(deps.kis, deps.calendar),
    syncDailyCandles: new SyncKrDailyCandles(deps.kis, deps.store, universe),
    pollQuotes: new PollKrStockQuotes(deps.kis, deps.store, deps.calendar, universe),
    syncMinuteBars: new SyncKrMinuteBars(deps.kis, deps.store, deps.calendar, universe),
    realtime,
    reportMetrics: new ReportKrProviderMetrics(deps.health),
    resolveLogos: new ResolveKrStockLogos({
      store: deps.store,
      universe,
      images: deps.logoImages,
      homepages: deps.homepages,
      logoDevToken: deps.logoDevToken,
    }),
    assertViewer: (viewer) => {
      if (!isKrStockViewer(viewer.email, deps.viewerEmails)) throw new KrStockNotAvailableError();
    },
    getSession: new GetKrMarketSession(read),
    listQuotes: new ListKrStockQuotes(read),
    getDetail: new GetKrStockDetail(read),
    getChart: new GetKrStockChart(read),
    search: new SearchKrStocks(read),
  };
};

export interface MarketUseCases {
  calculateSentiment: CalculateSentiment;
  trackSmartMoney: TrackSmartMoney;
  collectWhaleTrades: CollectWhaleTrades;
  getSentimentHistory: GetSentimentHistory;
  listWhaleTransactions: ListWhaleTransactions;
  getSymbolNews: GetSymbolNews;
  addToWatchlist: AddToWatchlist;
  listWatchlist: ListWatchlist;
  removeFromWatchlist: RemoveFromWatchlist;
  listWatchlistSymbols: ListWatchlistSymbols;
  updateWatchlistPrices: UpdateWatchlistPrices;
  getMarketOverview: GetMarketOverview;
  getMarketSummary: GetMarketSummary;
  getRealTimePrice: GetRealTimePrice;
  getChartData: GetChartData;
  listMarketSymbols: ListMarketSymbols;
  syncMarketListings: SyncMarketListings;
  updateAllMarketPrices: UpdateAllMarketPrices;
  collectPriceHistory: CollectPriceHistory;
  backfillDailyHistory: BackfillDailyHistory;
  refreshTechnicalIndicators: RefreshTechnicalIndicators;
  /** 키가 없으면 `null`(FR-6) */
  krStock: KrStockUseCases | null;
}

export const createMarketApplication = (deps: MarketDependencies) => {
  // 국내 주식 관심 종목 — 키가 없으면 `null`(담을 수 없고 목록에서도 빠진다, F011 슬라이스 3)
  const krWatchlist = deps.krStock
    ? { store: deps.krStock.store, viewerEmails: deps.krStock.viewerEmails, logoDevToken: deps.krStock.logoDevToken }
    : null;
  const krUniverse = deps.krStock
    ? new ResolveKrStockUniverse(deps.krStock.store, deps.krStock.held, deps.krStock.universeTopN)
    : null;
  const useCases: MarketUseCases = {
    calculateSentiment: new CalculateSentiment(
      deps.exchange,
      deps.fearGreed,
      deps.sentiments
    ),
    trackSmartMoney: new TrackSmartMoney(deps.exchange, deps.whales),
    collectWhaleTrades: new CollectWhaleTrades(
      deps.trades,
      deps.assets,
      deps.watchlist,
      deps.whales
    ),
    getSentimentHistory: new GetSentimentHistory(deps.sentiments),
    listWhaleTransactions: new ListWhaleTransactions(deps.whales),
    getSymbolNews: new GetSymbolNews(deps.news),
    addToWatchlist: new AddToWatchlist(deps.watchlist, deps.exchange, krWatchlist),
    // 관심 목록이 자산 표를 함께 읽는다 — 행에 가격이 없거나 오래된 심볼을 보정한다
    // (`SRV-REQ-008` FR-33). 두 리포지토리 다 이 컨텍스트 것이라 경계를 넘지 않는다.
    listWatchlist: new ListWatchlist(deps.watchlist, deps.assets, krWatchlist),
    removeFromWatchlist: new RemoveFromWatchlist(deps.watchlist),
    listWatchlistSymbols: new ListWatchlistSymbols(deps.watchlist),
    updateWatchlistPrices: new UpdateWatchlistPrices(deps.watchlist),
    getMarketOverview: new GetMarketOverview(
      deps.assets,
      deps.exchange,
      deps.prices
    ),
    getMarketSummary: new GetMarketSummary(
      deps.assets,
      deps.exchange,
      deps.news,
      deps.summaryPolicy
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
    // 국내 주식도 같은 지표를 만든다(F011 FR-60) — 대상은 시세 유니버스. 꺼져 있으면 코인만
    refreshTechnicalIndicators: new RefreshTechnicalIndicators(
      deps.assets,
      deps.prices,
      deps.indicators,
      krUniverse ? () => krUniverse.execute() : null
    ),
    krStock: deps.krStock ? createKrStockUseCases(deps.krStock) : null,
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
    assetQuotes: async (symbols) => {
      const krCodes = deps.krStock ? symbols.filter(isKrStockCode) : [];
      const [crypto, kr] = await Promise.all([
        deps.assets.findQuotes(symbols),
        krCodes.length > 0 && deps.krStock
          ? deps.krStock.store.quotes({ codes: krCodes, limit: krCodes.length, offset: 0 })
          : [],
      ]);
      return [
        ...crypto,
        ...kr.map((q) => ({
          symbol: q.code,
          assetType: "kr_stock" as const,
          koreanName: q.name,
          currentPrice: q.price,
          // 전일 종가 대비(%) — 코인의 24시간 변동률 자리. 장기 판단은 이 값과 일봉 RSI 만 쓴다
          change24h: q.changeRate,
          tradeValue24h: q.tradeValue,
          priceUpdatedAt: q.priceUpdatedAt,
        })),
      ];
    },
    recentWhalesForSymbols: (symbols, limit = 100) =>
      deps.whales.findRecentForSymbols(symbols, limit),
    highestCloseSince: (symbols, since) =>
      deps.prices.highestCloseSince(symbols, since),
    closeAtOrAfter: (symbol, at, timeframe) => deps.prices.closeAtOrAfter(symbol, at, timeframe),
    closeAtOrBefore: (symbol, at, timeframe, notBefore) =>
      deps.prices.closeAtOrBefore(symbol, at, timeframe, notBefore),
    candleCounts: (symbols, timeframe) => deps.prices.candleCounts(symbols, timeframe),
    highestCloseBetween: (symbol, from, to) => deps.prices.highestCloseBetween(symbol, from, to),
    latestCloses: (symbols) => deps.prices.latestCloses(symbols),
    closePercentiles: (symbol, timeframe, since, fractions) =>
      deps.prices.closePercentiles(symbol, timeframe, since, fractions),
    watchedSymbols: () => deps.watchlist.distinctSymbols("crypto"),
    krJudgmentUniverse: async () => (krUniverse ? krUniverse.execute() : []),
    krStockListing: async (email, code) => {
      const kr = deps.krStock;
      if (!kr) throw new KrStockDisabledError();
      if (!isKrStockViewer(email, kr.viewerEmails) || !isKrStockCode(code)) throw new KrStockNotAvailableError();
      const listing = await kr.store.findListing(code);
      if (!listing) throw new KrStockNotAvailableError();
      return { code: listing.code, name: listing.name };
    },
    krStockPrices: async (codes) => {
      if (!deps.krStock || codes.length === 0) return [];
      const rows = await deps.krStock.store.quotes({ codes, limit: codes.length, offset: 0 });
      return rows.map((q) => ({ code: q.code, price: q.price, priceUpdatedAt: q.priceUpdatedAt }));
    },
    sentimentForwardReturns: (query) =>
      deps.sentiments.forwardReturnsByBucket(query),
  };

  return { api, useCases };
};
