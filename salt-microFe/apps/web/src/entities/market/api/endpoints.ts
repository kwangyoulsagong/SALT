import { MarketOrder, MarketPeriod, MarketSort } from "../model/types";

/**
 * 시세 upstream 의 엔드포인트 경로.
 *
 * origin 은 `shared/config` 에 있고 **경로는 부르는 슬라이스가 갖는다** (FR-16).
 */
export const MARKET_ENDPOINTS = {
  overview: ({
    page,
    limit,
    sort,
    order,
    period,
    search,
  }: {
    page: number;
    limit: number;
    sort?: MarketSort | null;
    order?: MarketOrder | null;
    period?: MarketPeriod | null;
    search?: string | null;
  }) =>
    `/api/investment/market/overview?page=${page}&limit=${limit}` +
    `&sort=${sort ?? ""}` +
    `&order=${order ?? ""}` +
    `&period=${period ?? ""}` +
    `&search=${encodeURIComponent(search ?? "")}`,
  chartPreview: (symbol: string) =>
    `/api/investment/crypto/${symbol}/chart?period=miniute&unit=5&count=30`,
  intelligencePreview: (symbol: string) =>
    `/api/market-intelligence/${symbol}/dashboard`,
  /**
   * 관심 목록은 **`/api/app/*` 뷰모델 경로**다 (`FE-REQ-012` 호출 배치).
   *
   * 다른 셋은 아직 서버 계약을 그대로 보는 프록시 경로(`/api/investment/*`)를 쓴다.
   * 같은 origin 이지만 뜻이 다르다 — `/api/app` 은 BFF 가 소유한 화면 계약이고
   * 프록시는 서버 도메인 계약이다. 남은 셋의 이관은 `FE-REQ-012` 의 일이다.
   */
  watchlist: () => `/api/app/watchlist`,
  watchlistItem: (id: string) => `/api/app/watchlist/${encodeURIComponent(id)}`,
} as const;
