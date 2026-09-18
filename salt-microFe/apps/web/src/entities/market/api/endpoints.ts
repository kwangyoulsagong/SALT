import { MarketOrder, MarketPeriod, MarketSort } from "../model/types";

/** 차트 주기. 서버·BFF 가 아는 값이고 문자열을 직접 쓰지 않는다. */
const CHART_PERIOD_MINUTE = "minute";

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
  /**
   * 프리뷰 차트 — 5분봉 30개.
   *
   * `period` 가 **`miniute`(오타)였다** (`FE-REQ-010` FR-8). 서버가 `day` 가 아닌 값을
   * 전부 분봉으로 받아 줘서 **오타가 동작했고**, 그래서 아무도 고치지 않았다. 지금은
   * BFF 와 서버가 모르는 값을 422 로 거부한다 — **프론트가 먼저 배포되어야 한다.**
   */
  chartPreview: (symbol: string) =>
    `/api/investment/crypto/${symbol}/chart?period=${CHART_PERIOD_MINUTE}&unit=5&count=30`,
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
  /** 종목 뉴스도 `/api/app/*` 뷰모델 경로다. 카드가 쓰는 필드만 온다 */
  symbolNews: (symbol: string, limit: number) =>
    `/api/app/news?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
  watchlistItem: (id: string) => `/api/app/watchlist/${encodeURIComponent(id)}`,
} as const;
