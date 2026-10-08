"use client";

import type { KrChartPeriod } from "@repo/core/marketKr";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@/shared/api";

import type { KrOverviewQuery } from "./endpoints";
import { krStockApi } from "./krStockApi";
import { MarketApiError } from "./marketApi";
import { marketQueryKeys } from "./queryKeys";

/**
 * 국내 주식 쿼리(F011 `FE-REQ-041`).
 *
 * - **로그인해야 부른다**(`useHasAccessToken`) — 비회원에게 국내 주식 시세 0건(F011 §정책). 서버 렌더에선 `null` 이라 안 부른다
 * - **4xx 는 다시 부르지 않는다.** 404 는 소유자가 아니라는 뜻이고 다시 불러도 같다
 * - 저장값 조회는 **1분마다** 다시 받는다 — 실시간 슬롯 밖 종목(`poll_1m`)이 서버에서 1분마다 바뀌고, WS 가 거부 ·
 *   끊겨도 표가 멈추지 않는다. 서버는 KIS 를 부르지 않고 저장값만 읽는다(80ms 예산, F011 비기능)
 */
const KR_REFRESH_MS = 60_000;
const KR_STALE_MS = 30_000;
/** 5분봉 차트는 5분마다 한 봉 — 1분마다 받을 이유가 없다. 실시간 봉 병합은 이 슬라이스 범위 밖(FE-REQ-041 미검증) */
const KR_CHART_STALE_MS = 5 * 60_000;
/** 상세 차트 봉 수 — 일봉 약 1년 · 5분봉 약 6거래일(서버 상한 500) */
export const KR_CHART_CANDLE_COUNT = 240;

const isClientError = (error: unknown) =>
  error instanceof MarketApiError && error.status >= 400 && error.status < 500;

const retryUnlessClientError = (failureCount: number, error: unknown) =>
  !isClientError(error) && failureCount < 1;

/** 1분 주기 — 4xx(소유자 아님 · 없는 종목)면 멈춘다. 멈추지 않으면 비소유자 화면이 1분마다 404 를 낸다 */
const refreshUnlessClientError = (query: { state: { error: unknown } }) =>
  isClientError(query.state.error) ? false : KR_REFRESH_MS;

export const useKrMarketStatus = () => {
  const signedIn = useHasAccessToken() === true;
  return useQuery({
    queryKey: marketQueryKeys.krSession,
    queryFn: ({ signal }) => krStockApi.session(signal),
    enabled: signedIn,
    staleTime: KR_STALE_MS,
    refetchInterval: refreshUnlessClientError,
    retry: retryUnlessClientError,
  });
};

/** 쿼리 키 — 실시간 반영(`useKrOverviewRealtime`)이 같은 키로 캐시를 고친다 */
export const krOverviewKey = (query: KrOverviewQuery) =>
  [...marketQueryKeys.krOverview, query.limit, query.offset, query.sort ?? "", query.order ?? "", query.period ?? ""] as const;

export const useKrOverview = (query: KrOverviewQuery, enabled = true) => {
  const signedIn = useHasAccessToken() === true;
  return useQuery({
    queryKey: krOverviewKey(query),
    queryFn: ({ signal }) => krStockApi.overview(query, signal),
    enabled: signedIn && enabled,
    // 필터를 바꿔도 이전 표를 둔다 — 비었다 채워지며 아래가 밀리지 않게
    placeholderData: keepPreviousData,
    staleTime: KR_STALE_MS,
    refetchInterval: refreshUnlessClientError,
    retry: retryUnlessClientError,
  });
};

export const useKrDetail = (code: string) => {
  const signedIn = useHasAccessToken() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.krDetail, code],
    queryFn: ({ signal }) => krStockApi.detail(code, signal),
    enabled: signedIn && Boolean(code),
    staleTime: KR_STALE_MS,
    refetchInterval: refreshUnlessClientError,
    retry: retryUnlessClientError,
  });
};

export const useKrChart = (code: string, period: KrChartPeriod, count = KR_CHART_CANDLE_COUNT) => {
  const signedIn = useHasAccessToken() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.krChart, code, period, count],
    queryFn: ({ signal }) => krStockApi.chart(code, period, count, signal),
    enabled: signedIn && Boolean(code),
    // 기간을 바꿔도 이전 봉을 둔다 — 차트가 비었다 채워지며 아래가 밀리지 않게(`useMarketChart` 와 같다)
    placeholderData: keepPreviousData,
    staleTime: KR_CHART_STALE_MS,
    retry: retryUnlessClientError,
  });
};
