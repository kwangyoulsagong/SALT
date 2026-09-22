/**
 * 투자 화면 시장 요약 띠의 화면 계약 (`BFF-REQ-035` · 서버 `SRV-REQ-036`).
 *
 * **무엇을 요약할지 · 태그 · 등락 금액은 서버가 정한다.** 여기서는 계산하지 않고 모양만 좁힌다 —
 * 모르는 태그 코드는 버린다(화면이 모르는 코드를 원문 그대로 그리지 않게).
 *
 * `bff` 는 pnpm workspace 밖이라 프론트 타입(`entities/market` `MarketSummaryResponse`)과
 * 계약이 두 곳에 있다. 필드를 바꿀 때 같이 본다.
 */

/** 화면이 아는 태그 코드. 서버 `MarketSummaryTag` 와 같은 값이다 */
export const KNOWN_SUMMARY_TAGS = ["wide_move"] as const;
export type MarketSummaryTagVM = (typeof KNOWN_SUMMARY_TAGS)[number];

export interface ServerMarketSummaryItem {
  symbol: string;
  koreanName: string | null;
  logoUrl: string;
  currentPrice: number;
  change24h: number;
  change24hAmount: number | null;
  tags: string[];
  sparkline: number[] | null;
  priceUpdatedAt: string | null;
}

export interface ServerMarketSummary {
  featured: ServerMarketSummaryItem | null;
  items: ServerMarketSummaryItem[];
  sparklineWindowMinutes: number;
  degraded: boolean;
}

export interface MarketSummaryItemVM {
  symbol: string;
  /** 한글 이름이 없으면 심볼 — 빈 이름을 그리지 않는다 */
  name: string;
  logoUrl: string;
  currentPrice: number;
  change24h: number;
  /** 서버가 반올림한 원 단위 정수. 없으면 `null` — 0 이 아니다 */
  change24hAmount: number | null;
  tags: MarketSummaryTagVM[];
  sparkline: number[] | null;
}

export interface MarketSummaryVM {
  featured: MarketSummaryItemVM | null;
  items: MarketSummaryItemVM[];
  sparklineWindowMinutes: number;
  degraded: boolean;
}

const isKnownTag = (tag: string): tag is MarketSummaryTagVM =>
  (KNOWN_SUMMARY_TAGS as readonly string[]).includes(tag);

const toItem = (item: ServerMarketSummaryItem): MarketSummaryItemVM => ({
  symbol: item.symbol,
  name: item.koreanName || item.symbol,
  logoUrl: item.logoUrl,
  currentPrice: item.currentPrice,
  change24h: item.change24h,
  change24hAmount: item.change24hAmount,
  tags: (item.tags ?? []).filter(isKnownTag),
  sparkline: item.sparkline && item.sparkline.length >= 2 ? item.sparkline : null,
});

export const toMarketSummaryViewModel = (
  summary: ServerMarketSummary,
): MarketSummaryVM => ({
  featured: summary.featured ? toItem(summary.featured) : null,
  items: (summary.items ?? []).map(toItem),
  sparklineWindowMinutes: summary.sparklineWindowMinutes,
  degraded: Boolean(summary.degraded),
});
