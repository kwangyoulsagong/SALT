import {
  MarketOverviewItem,
  MarketPreviewSubject,
  WatchlistItem,
} from "../model/types";

/** 시세 목록 한 줄은 크립토다 — 목록 자체가 업비트 KRW 마켓이다. */
const CRYPTO = "crypto";

export const overviewItemToPreviewSubject = (
  item: MarketOverviewItem,
): MarketPreviewSubject => ({
  symbol: item.symbol,
  displayName: item.koreanName,
  assetType: CRYPTO,
  currentPrice: item.currentPrice,
  change24h: item.change24h,
  logoUrl: item.logoUrl,
});

/**
 * 관심 목록 항목으로 프리뷰 주제를 만든다.
 *
 * 시세 목록에 없는 종목의 **대체 경로**다. 목록에 있으면 그쪽이 낫다 — 고가·저가까지
 * 같은 스냅샷에서 오고 실시간 갱신도 그 쿼리가 받는다.
 */
export const watchlistItemToPreviewSubject = (
  item: WatchlistItem,
): MarketPreviewSubject => ({
  symbol: item.symbol,
  displayName: item.name,
  assetType: item.assetType,
  currentPrice: item.currentPrice,
  change24h: item.changeRate,
  logoUrl: item.logoUrl,
});
