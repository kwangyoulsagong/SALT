import { MarketOrder, MarketPeriod, MarketSort } from "@/entities/market";

/**
 * 시세 목록 조회의 기본 파라미터.
 *
 * **두 탭이 같은 값을 써야 한다.** 관심 종목 탭의 우측 프리뷰는 실시간 탭과 같은
 * 컴포넌트(`MarketPreview`)를 쓰고, 그 컴포넌트는 시세 목록의 한 줄(`MarketOverviewItem`)
 * 을 받는다. 파라미터가 한 글자라도 다르면 **쿼리 키가 달라져 목록을 한 번 더 받는다** —
 * 같으면 실시간 탭이 이미 채워 둔 캐시를 그대로 쓴다.
 *
 * `limit=100` 은 변경 금지 목록이다 (`FE-REQ-010` 변경 금지 표).
 */
export const DEFAULT_MARKET_PARAMS = {
  page: 1,
  limit: 100,
  sort: MarketSort.All,
  order: MarketOrder.Ascending,
  period: MarketPeriod.Realtime,
} as const;
