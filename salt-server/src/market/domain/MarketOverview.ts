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
