import type {
  KrChart,
  KrChartPeriod,
  KrMarketStatus,
  KrOverview,
  KrResult,
  KrStockDetail,
} from "@repo/core/marketKr";

import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { type KrOverviewQuery, MARKET_ENDPOINTS } from "./endpoints";
import { MarketApiError } from "./marketApi";

/**
 * 국내 주식 조회(F011 `FE-REQ-041`) — BFF `/api/app/market/kr/*`(`BFF-REQ-040`). `{ success, data }` 로 싸여 온다.
 *
 * 상태는 세 갈래다. 화면이 갈라 그린다:
 * - `ok` — 값
 * - `disabled`(키 없음) · `unavailable`(서버 5xx · 계약 깨짐) — **200 으로 온다.** 값이지 오류가 아니다
 * - 404(소유자 아님 · 없는 종목) · 401 · 400 — `MarketApiError` 로 던진다. 404 는 존재를 알리지 않는 응답이라 화면은
 *   국내 주식 자리를 **숨긴다**
 */
const getKr = async <T>(endpoint: string, path: string, signal?: AbortSignal): Promise<T> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${path}`, { headers: authHeader(), signal });
  if (!response.ok) throw new MarketApiError(endpoint, response.status);
  const body = (await response.json()) as { data: T };
  return body.data;
};

export const krStockApi = {
  session: (signal?: AbortSignal) =>
    getKr<KrResult<KrMarketStatus>>("krSession", MARKET_ENDPOINTS.krSession(), signal),
  overview: (query: KrOverviewQuery, signal?: AbortSignal) =>
    getKr<KrResult<KrOverview>>("krOverview", MARKET_ENDPOINTS.krOverview(query), signal),
  detail: (code: string, signal?: AbortSignal) =>
    getKr<KrResult<KrStockDetail>>("krDetail", MARKET_ENDPOINTS.krDetail(code), signal),
  chart: (code: string, period: KrChartPeriod, count: number, signal?: AbortSignal) =>
    getKr<KrResult<KrChart>>("krChart", MARKET_ENDPOINTS.krChart(code, period, count), signal),
};
