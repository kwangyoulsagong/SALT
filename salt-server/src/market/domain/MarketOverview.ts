/** 마켓 목록의 정렬 축. 자유 문자열을 받지 않는다 (`ddd-application.md` §6). */
export enum MarketOverviewSort {
  TradeValue = "trade_value",
  Change = "change",
  Price = "price",
  Name = "name",
}

export const isMarketOverviewSort = (
  value: unknown
): value is MarketOverviewSort =>
  typeof value === "string" &&
  (Object.values(MarketOverviewSort) as string[]).includes(value);

/**
 * 차트 주기.
 *
 * **서버가 실제로 주는 것은 둘뿐이다.** `FE-REQ-010` FR-50 은 `week`·`month` 까지
 * 네 값을 적었지만 거래소 호출도 소비 화면도 없다 — 목록에만 넣으면 200 을 기대하게
 * 되고 실제로는 빈 배열이 온다. 필요해질 때 `ExchangeQuotePort` 와 함께 늘린다.
 *
 * 자유 문자열을 받지 않는 이유는 `MarketOverviewSort` 와 같다 (`ddd-application.md` §6).
 */
export enum ChartPeriod {
  Minute = "minute",
  Day = "day",
}

export const isChartPeriod = (value: unknown): value is ChartPeriod =>
  typeof value === "string" &&
  (Object.values(ChartPeriod) as string[]).includes(value);

export type SortDirection = "asc" | "desc";

export interface MarketOverviewQuery {
  page: number;
  limit: number;
  sort: MarketOverviewSort;
  order: SortDirection;
  search?: string;
}

export interface MarketAssetView {
  symbol: string;
  market: string;
  koreanName: string | null;
  englishName: string | null;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  tradeValue24h: number;
  logoUrl: string;
  priceUpdatedAt: Date | null;
}

/**
 * 거래소 로고 URL.
 *
 * 원문은 이 문자열을 `investment.service` 두 곳과 `market-intelligence` 에 복사해 뒀다.
 * 기본값 규칙이 한 곳이면 거래소를 바꿀 때 고칠 자리가 하나다.
 */
export const UPBIT_LOGO_BASE = "https://static.upbit.com/logos/";

export const logoUrlOf = (symbol: string) => `${UPBIT_LOGO_BASE}${symbol}.png`;
