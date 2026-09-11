/**
 * 시세 슬라이스의 데이터 계약.
 *
 * 열거값은 enum, 데이터 구조는 interface 다 (`layered-architecture.md` §6).
 * 지금 응답을 주는 것은 투자 upstream 이다. BFF 뷰모델로 바뀌면(`FE-REQ-024`)
 * 이 파일이 `@repo/core` 의 계약을 re-export 하는 자리가 된다.
 */

export enum MarketSort {
  All = "",
  TradeValue = "trade_value",
  Change = "change",
  Price = "price",
  Name = "name",
}

export enum MarketOrder {
  Ascending = "",
  Descending = "desc",
}

export enum MarketPeriod {
  Realtime = "",
  OneDay = "1d",
  OneWeek = "7d",
  OneMonth = "1m",
  ThreeMonths = "3m",
  SixMonths = "6m",
  OneYear = "1y",
}

export interface MarketOverviewItem {
  symbol: string;
  market: string;
  koreanName: string;
  englishName: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  tradeValue24h: number;
  logoUrl: string;
  priceUpdatedAt: string;
}

export interface MarketOverviewResponse {
  items: MarketOverviewItem[];
}

export interface MarketOverviewParams {
  page: number;
  limit: number;
  sort?: MarketSort;
  order?: MarketOrder;
  period?: MarketPeriod;
  search?: string;
}

export interface MarketChartPreviewItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketChartPreviewResponse {
  data: MarketChartPreviewItem[];
}

export interface InterpretationInfo {
  emoji: string;
  title: string;
  message: string;
  action: string;
  color: string;
}

export interface SentimentComponents {
  price: number;
  volatility: number;
  volume: number;
  fearGreed: number;
}

export interface SentimentInfo {
  id: string;
  symbol: string;

  sentimentScore: number;
  fearGreedIndex: number;
  volatility: number;

  volume24h: number;
  priceChange24h: number;

  socialMentions: number;
  searchTrend: number;

  /**
   * upstream 이 열거를 보장하지 않는다(`bullish`·`bearish`·`neutral` 외 값이 온다).
   * 서버가 계약을 좁힐 때까지 `string` 이다 — 리터럴 union 으로 좁히면 거짓 안전이 된다.
   */
  sentimentLabel: string;

  calculatedAt: string;

  interpretation: InterpretationInfo;

  components: SentimentComponents;
}

export interface SmartMoneyInfo {
  smartMoneyIndex: {
    score: number;
    signal: string;
  };

  signals: {
    largeTrades: number;
    largeBuys: number;
    largeSells: number;
    orderbookRatio: string;
  };

  interpretation: InterpretationInfo;
}

export interface MarketIntelligencePreviewItem {
  symbol: string;
  sentiment: SentimentInfo;
  smartMoney: SmartMoneyInfo;
  timestamp: string;
}

export interface MarketIntelligencePreviewResponse {
  data: MarketIntelligencePreviewItem;
}

export interface MarketSymbolNewsParams {
  symbol: string;
  source?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface MarketSymbolNewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  author: string | null;
  symbols: string[];
  sentiment: string;
  viewCount: number;
  publishedAt: string;
}

export interface MarketSymbolNewsItem {
  articles: MarketSymbolNewsArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MarketSymbolNewsResponse {
  data: MarketSymbolNewsItem;
}
