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

/**
 * 우측 프리뷰가 **실제로 쓰는 것**.
 *
 * 원래 프리뷰는 시세 목록의 한 줄(`MarketOverviewItem`)을 통째로 받았다. 그래서
 * 목록에 없는 종목 — 시세 100위 밖이나 주식 — 은 프리뷰를 그릴 수 없었고 패널이
 * 빈 채로 남았다. 헤더가 쓰는 다섯 개만 받으면 **관심 목록 항목으로도 만들 수 있다.**
 *
 * `assetType` 이 필요한 이유: 차트와 심리·스마트머니는 업비트 소스라 **크립토에만**
 * 있다. 주식에 그 블록을 그리면 404 를 기다리는 빈 영역이 된다.
 */
export interface MarketPreviewSubject {
  symbol: string;
  displayName: string;
  assetType: string;
  currentPrice: number | null;
  change24h: number | null;
  logoUrl: string | null;
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

/**
 * 관심 목록 한 줄. **BFF 가 소유한 뷰모델**이다 (`/api/app/watchlist`).
 *
 * `bff` 는 pnpm workspace 밖의 독립 npm 프로젝트라 `@repo/core` 를 import 할 수 없다.
 * 그래서 계약이 지금은 두 곳에 있다 — 합치는 것은 이 파일 상단 주석이 예고한 대로
 * `FE-REQ-024` 다. 필드 이름을 바꿀 때 `bff/src/services/app-watchlist.service.ts` 를
 * 같이 본다.
 */
export interface WatchlistItem {
  id: string;
  /**
   * 자산군. **열거로 좁히지 않는다** — DB enum 이 `crypto`·`stock` 2값인데
   * `DB-REQ-003` 이 `kr_stock`·`us_stock` 로 넓힌다. 지금 2값으로 못 박으면 그때
   * 거짓 안전이 된다. 표시 문구는 `WATCHLIST_ASSET_LABELS` 가 정하고 모르는 값은
   * 심볼만 보여준다.
   */
  assetType: string;
  symbol: string;
  name: string;
  /** 없으면 `null`. **0 이 아니다** — 0 은 "가격이 0원"으로 읽힌다 */
  currentPrice: number | null;
  changeRate: number | null;
  /** 이 값이 실시간이 아니다. 화면은 "지연" 배지를 붙인다 */
  priceStale: boolean;
  /** 크립토만 있다. 주식은 `null` — 플레이스홀더를 만들지 않고 영역을 비운다 */
  logoUrl: string | null;
  priceUpdatedAt: string | null;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
}

/** 추가할 때 **우리가 고르는** 값이라 열거로 좁힌다. */
export enum WatchlistAssetType {
  Crypto = "crypto",
  Stock = "stock",
}

export interface AddWatchlistRequest {
  assetType: WatchlistAssetType;
  symbol: string;
  name: string;
}

/**
 * 뉴스 프리뷰 카드 한 장. **BFF 가 소유한 뷰모델**이다 (`/api/app/news`).
 *
 * 이전에는 서버 응답 모양(`articles` + `pagination` + `content`)을 그대로 적어 뒀고
 * 그것을 부르는 함수는 **던지는 스텁**이었다. 화면이 상수를 그리고 있었기 때문에
 * 아무도 쓰지 않았다.
 */
export interface NewsPreviewItem {
  id: string;
  title: string;
  summary: string | null;
  /** 없으면 `null`. 화면은 **이미지 영역을 렌더하지 않는다** (`FE-REQ-010` FR-41) */
  imageUrl: string | null;
  source: string;
  url: string;
  publishedAt: string;
  /** 서버가 줄 때만 있다. 없으면 그 칸을 그리지 않는다 */
  viewCount?: number;
}

export interface NewsPreviewResponse {
  items: NewsPreviewItem[];
}

