import type { IndicatorSet } from "./Indicators";
import type {
  MarketAssetView,
  MarketOverviewQuery,
  SortDirection,
} from "./MarketOverview";
import type { SentimentLabel } from "./Sentiment";

/**
 * `market` 이 밖에 요구하는 것. Port 선언은 `domain` 이 하고 `infrastructure` 가 구현한다.
 *
 * ## 자산군 타입을 `shared` 의 것으로 쓰지 않는다
 *
 * Shared Kernel 의 `AssetType` 은 `crypto` · `kr_stock` · `us_stock` 인데 **DB enum 은
 * `crypto` · `stock` 두 값뿐이다.** 커널 타입을 여기 쓰면 DB 가 거부하는 값을 컴파일이
 * 통과시킨다. 확장은 `DB-REQ-003`(`ALTER TYPE` 락 측정 포함)의 일이고, 그때까지
 * 이 컨텍스트는 **DB 가 실제로 아는 두 값**만 쓴다.
 */
export type MarketAssetType = "crypto" | "stock";

/** 거래소 시세 한 건. 거래소 응답 필드 이름은 여기까지 오지 않는다. */
export interface Quote {
  symbol: string;
  market: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  /** 24시간 체결 **수량** (`acc_trade_volume_24h`). */
  volume24h: number;
  /** 24시간 체결 **대금** (`acc_trade_price_24h`). 심리 점수가 쓰는 것은 이쪽이다. */
  tradeValue24h: number;
  timestamp: Date;
}

/** 차트 응답. 거래소 필드 이름을 프론트 계약으로 옮긴 모양이고 **그대로 내려간다**. */
export interface DailyCandleView {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MinuteCandleView extends Omit<DailyCandleView, "date"> {
  timestamp: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  timestamp: Date;
}

export type PriceTimeframe = "5m" | "15m" | "1h" | "1d";

export interface MarketListing {
  market: string;
  symbol: string;
  koreanName: string;
  englishName: string;
}

/** 대량 체결 한 건. 금액 기준 필터는 이 Port 의 구현이 아니라 유스케이스가 정한다. */
export interface Trade {
  side: "buy" | "sell";
  price: number;
  volume: number;
}

export interface OrderbookPressure {
  bids: number;
  asks: number;
}

/**
 * 거래소 조회 Port.
 *
 * **주문·출금 메서드를 선언하지 않는다.** 선언이 없으면 구현도 호출도 생길 수 없다 —
 * 전 영역 공통 수용 기준("주문을 실행하는 코드 경로가 없다")을 타입으로 못 박는다.
 *
 * > 전부 **트랜잭션 밖에서** 호출한다 (`ddd-application.md` §3).
 */
export interface ExchangeQuotePort {
  currentPrice(symbol: string): Promise<Quote>;
  currentPrices(symbols: string[]): Promise<Quote[]>;
  dailyCandles(symbol: string, count: number): Promise<DailyCandleView[]>;
  minuteCandles(
    symbol: string,
    unit: number,
    count: number
  ): Promise<MinuteCandleView[]>;
  /**
   * 최근 `count` 일의 **일별 체결 대금**. 심리 점수의 평균 거래량 분모다.
   *
   * `dailyCandles` 로 대신하지 않는 이유: 차트용 매핑에는 체결 대금 필드가 없고,
   * 있게 만들면 차트 응답 모양이 바뀐다.
   */
  dailyTradeValues(symbol: string, count: number): Promise<number[]>;
  candlesByTimeframe(
    symbol: string,
    timeframe: PriceTimeframe,
    count: number
  ): Promise<Candle[]>;
  krwMarkets(): Promise<MarketListing[]>;
  recentTrades(symbol: string, count: number): Promise<Trade[]>;
  orderbookPressure(symbol: string): Promise<OrderbookPressure>;
}

/** Fear & Greed 지수. 실패하면 `null` 이고 심리 점수는 그것 없이 계산된다. */
export interface FearGreedPort {
  current(): Promise<{ value: number; classification: string } | null>;
}

/** 종목 뉴스 — `news` 컨텍스트를 우리 언어로 번역하는 ACL 의 Port. */
export interface SymbolNewsPort {
  recent(symbol: string, limit: number): Promise<SymbolNewsItem[]>;
}

export interface SymbolNewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  sentiment?: string | null;
  publishedAt: Date;
}

/** 자산 한 줄의 시세. 코치·주문 전 계산이 현재가와 신선도를 본다. */
export interface AssetQuote {
  symbol: string;
  currentPrice: number | null;
  change24h: number | null;
  priceUpdatedAt: Date | null;
}

export interface MarketAssetRepository {
  /** 저장된 시세. 거래소를 부르지 않는다 — 판단용 조회는 DB 값을 쓴다. */
  findQuotes(symbols: string[]): Promise<AssetQuote[]>;
  findPage(
    query: MarketOverviewQuery
  ): Promise<{ items: MarketAssetView[]; total: number }>;
  /** 활성 심볼. `assetType` 을 주면 그 자산군만. */
  activeSymbols(assetType?: MarketAssetType): Promise<string[]>;
  /** 가격이 `staleBefore` 보다 오래됐거나 없는 심볼만. 배경 갱신 대상을 좁힌다. */
  symbolsWithStalePrice(
    symbols: string[],
    staleBefore: Date
  ): Promise<string[]>;
  upsertListings(listings: MarketListing[]): Promise<void>;
  markDelistedExcept(symbols: string[]): Promise<void>;
  applyQuotes(quotes: Quote[]): Promise<void>;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  assetType: MarketAssetType;
  symbol: string;
  name: string;
  /**
   * 행에 적힌 시세. **`unknown` 이었다** — Prisma `Decimal` 을 그대로 흘려보내서
   * JSON 에서 `"158000000"` (문자열)로 나갔고, 화면이 숫자로 쓰면 그 자리에서 깨진다.
   * 변환은 어댑터가 한다 (`ddd-infrastructure.md` — DB 모양은 경계에서 끝난다).
   *
   * **없으면 `null` 이다. 0 으로 떨어뜨리지 않는다** — 0 은 "가격이 0원"으로 읽힌다.
   */
  currentPrice: number | null;
  priceChange24h: number | null;
  lastUpdated: Date | null;
  addedAt: Date;
}

/**
 * 관심 목록 한 줄의 화면 계약 (`SRV-REQ-008` FR-33).
 *
 * 행에 적힌 시세와 `market_assets` 의 저장 시세 **둘 중 더 최근 것**을 담는다. 두 값이
 * 따로 갱신되기 때문이다 — 행은 BFF 가 실시간 캐시를 밀어 넣을 때(크립토만), 자산 표는
 * `market` 워커가 주기적으로. 어느 쪽이 최신인지는 호출 시점마다 다르다.
 *
 * `priceUpdatedAt` 을 함께 주는 이유는 **신선도 판정을 부르는 쪽이 하기 때문**이다.
 * BFF 가 실시간 캐시와 대조해 `priceStale` 을 붙인다 (`BFF-REQ-007` FR-42).
 */
export interface WatchlistItemView {
  id: string;
  assetType: MarketAssetType;
  symbol: string;
  name: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceUpdatedAt: Date | null;
  logoUrl: string;
  addedAt: Date;
}

export interface WatchlistRepository {
  exists(
    userId: string,
    assetType: MarketAssetType,
    symbol: string
  ): Promise<boolean>;
  add(input: {
    userId: string;
    assetType: MarketAssetType;
    symbol: string;
    name: string;
    currentPrice: number | null;
    priceChange24h: number | null;
  }): Promise<WatchlistItem>;
  findPage(
    userId: string,
    assetType: MarketAssetType | undefined,
    page: number,
    limit: number
  ): Promise<{ items: WatchlistItem[]; total: number }>;
  /** 남의 항목이면 지우지 않고 `false`. 소유 검사를 왕복 한 번에 끝낸다. */
  removeOwned(userId: string, watchlistId: string): Promise<boolean>;
  distinctSymbols(assetType: MarketAssetType): Promise<string[]>;
  applyPrices(
    prices: Array<{
      symbol: string;
      currentPrice: number;
      priceChange24h: number;
    }>
  ): Promise<number>;
}

export interface SentimentRecord {
  symbol: string;
  sentimentScore: number;
  fearGreedIndex?: number;
  volatility: number;
  volume24h: number;
  priceChange24h: number;
  sentimentLabel: SentimentLabel;
}

export interface StoredSentiment extends SentimentRecord {
  id: string;
  calculatedAt: Date;
}

export interface SentimentRepository {
  save(record: SentimentRecord): Promise<StoredSentiment>;
  findLatest(symbol: string): Promise<StoredSentiment | null>;
  /** 여러 심볼의 최신 심리를 한 번에. 심볼당 조회를 부르지 않게 하는 자리다. */
  findLatestMany(symbols: string[]): Promise<StoredSentiment[]>;
  findHistorySince(
    symbol: string,
    since: Date
  ): Promise<
    Array<{ sentimentScore: number; sentimentLabel: string; calculatedAt: Date }>
  >;
}

export interface WhaleTransactionRecord {
  symbol: string;
  transactionType: "buy" | "sell";
  amount: number;
  amountKRW: number;
  exchange: string;
}

export interface StoredWhaleTransaction extends WhaleTransactionRecord {
  id: string;
  detectedAt: Date;
}

export interface WhaleTransactionRepository {
  saveMany(records: WhaleTransactionRecord[]): Promise<void>;
  findRecent(symbol: string, limit: number): Promise<StoredWhaleTransaction[]>;
  /** 여러 심볼의 최근 대량 체결. 합산은 부르는 쪽이 한다. */
  findRecentForSymbols(
    symbols: string[],
    limit: number
  ): Promise<StoredWhaleTransaction[]>;
}

export interface ClosePoint {
  symbol: string;
  close: number;
  timestamp: Date;
}

export interface PriceHistoryRepository {
  upsertCandles(
    symbol: string,
    assetType: MarketAssetType,
    timeframe: PriceTimeframe,
    candles: Candle[]
  ): Promise<void>;
  /** 여러 심볼의 종가를 한 번에. 화면·성과 계산이 N+1 을 만들지 않게 하는 자리다. */
  closesSince(symbols: string[], since: Date): Promise<ClosePoint[]>;
  /**
   * `since` 이후 5분봉 **최고 종가**를 심볼별로.
   *
   * 행을 옮겨 와서 `Math.max` 하지 않는다 — 48시간이면 심볼당 576행이다
   * (`ddd-infrastructure.md` §3).
   */
  highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Array<{ symbol: string; close: number }>>;
  /** `at` **이후 첫** 종가. 없으면 `null`. 성적표의 진입가다. */
  closeAtOrAfter(symbol: string, at: Date): Promise<number | null>;
  /** 심볼별 마지막 종가. */
  latestCloses(symbols: string[]): Promise<ClosePoint[]>;
  /** 지표 계산용 최근 캔들. 최신이 앞이다. */
  recentCandles(
    symbol: string,
    timeframe: string,
    take: number
  ): Promise<Array<Candle & { assetType: MarketAssetType }>>;
  purgeOlderThan(retention: Array<{ timeframe: string; interval: string }>): Promise<void>;
}

/**
 * 저장된 지표.
 *
 * **`IndicatorSet` 을 상속하지 않는다.** 계산 결과는 항상 숫자지만 DB 컬럼은 nullable
 * 이고, 값이 없는 지표를 0 으로 채우면 "RSI 0"(극단적 과매도)이라는 거짓이 된다.
 * 소비처가 판단할 수 있게 `null` 을 그대로 드러낸다.
 */
export interface StoredIndicator {
  symbol: string;
  timeframe: string;
  timestamp: Date;
  rsi14: number | null;
  ma20: number | null;
  ma50: number | null;
  volumeAvg20: number | null;
}

export interface IndicatorRepository {
  upsert(input: {
    symbol: string;
    assetType: MarketAssetType;
    timeframe: string;
    timestamp: Date;
    indicators: IndicatorSet;
  }): Promise<void>;
  findLatest(symbol: string): Promise<StoredIndicator | null>;
  /**
   * 여러 심볼의 최신 지표. `timeframe` 을 주면 그 주기만 본다.
   *
   * 지표는 `m5` 와 `h1` 두 주기로 저장된다. 주기를 섞어 "최신"을 고르면 같은 심볼이
   * 호출마다 다른 주기의 RSI 를 준다 — 부르는 쪽이 주기를 정하게 열어 둔다.
   */
  findLatestMany(
    symbols: string[],
    timeframe?: string
  ): Promise<StoredIndicator[]>;
}

export type { SortDirection };
