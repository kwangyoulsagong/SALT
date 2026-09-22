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
  high24h: number;
  low24h: number;
  tradeValue24h: number;
  priceUpdatedAt: string | null;
}

/** 대표 종목의 최근 뉴스 한 줄 — 서버가 매체 꼬리를 떼고 중복을 합쳤다 */
export interface MarketSummaryHeadlineVM {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

/** 활성 종목의 24시간 오름 · 내림 · 그대로 수 — 서버가 센다 */
export interface MarketBreadthVM {
  up: number;
  down: number;
  flat: number;
  total: number;
}

export interface ServerMarketSummary {
  featured: ServerMarketSummaryItem | null;
  items: ServerMarketSummaryItem[];
  sparklineWindowMinutes: number;
  breadth: MarketBreadthVM | null;
  headlines?: MarketSummaryHeadlineVM[];
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
  /** 대표 칸 아래 줄. 저장 시세 그대로 */
  high24h: number;
  low24h: number;
  /** 서버가 반올림한 원 단위 정수 */
  tradeValue24h: number;
}

export interface MarketSummaryVM {
  featured: MarketSummaryItemVM | null;
  items: MarketSummaryItemVM[];
  sparklineWindowMinutes: number;
  /** 세지 못했거나 옛 서버면 `null` — 화면은 그 패널을 그리지 않는다 */
  breadth: MarketBreadthVM | null;
  /** 없으면 빈 배열 — 화면은 목록을 그리지 않는다 */
  headlines: MarketSummaryHeadlineVM[];
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
  high24h: item.high24h,
  low24h: item.low24h,
  tradeValue24h: item.tradeValue24h,
});

export const toMarketSummaryViewModel = (
  summary: ServerMarketSummary,
): MarketSummaryVM => ({
  featured: summary.featured ? toItem(summary.featured) : null,
  items: (summary.items ?? []).map(toItem),
  sparklineWindowMinutes: summary.sparklineWindowMinutes,
  // 합이 0 이면 셀 것이 없던 것이다 — 빈 막대를 그리지 않게 null
  breadth: summary.breadth && summary.breadth.total > 0 ? summary.breadth : null,
  headlines: (summary.headlines ?? []).map(({ id, title, url, source, publishedAt }) => ({
    id,
    title,
    url,
    source,
    publishedAt,
  })),
  degraded: Boolean(summary.degraded),
});
