/**
 * `apps/web` zone의 API 상수.
 *
 * 플랫폼 무관한 값(HTTP 상태·에러 메시지·재시도 정책·인증 키)은 `@repo/core`에 있다.
 * 여기서는 그것을 re-export하고 **이 zone에서만 쓰는 origin과 엔드포인트**를 더한다.
 */
export {
  NETWORK,
  HTTP_STATUS_CODE,
  HTTP_ERROR_MESSAGE,
  TOAST_MESSAGES,
  ERROR_MESSAGE,
} from "@repo/core/http";

export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  PUBLIC_PATHS,
} from "@repo/core/auth";

/** 인증·목표 API */
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";

/** 투자 API — 별도 upstream이다 */
export const INVESTMENTS_BASE_URL =
  process.env.NEXT_PUBLIC_INVESTMENTS_BASE_URL || "http://localhost:4001";

export const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:4002";

export const END_POINTS = {
  marketOverview: ({
    page,
    limit,
    sort,
    order,
    period,
    search,
  }: {
    page: number;
    limit: number;
    sort?: string | null;
    order?: string | null;
    period?: string | null;
    search?: string | null;
  }) => {
    return (
      `/api/investment/market/overview?page=${page}&limit=${limit}` +
      `&sort=${sort ?? ""}` +
      `&order=${order ?? ""}` +
      `&period=${period ?? ""}` +
      `&search=${encodeURIComponent(search ?? "")}`
    );
  },
  marketChartPreview: (symbol: string) => {
    return `/api/investment/crypto/${symbol}/chart?period=miniute&unit=5&count=30`;
  },
  marketIntelligencePreview: (symbol: string) => {
    return `/api/market-intelligence/${symbol}/dashboard`;
  },
} as const;
