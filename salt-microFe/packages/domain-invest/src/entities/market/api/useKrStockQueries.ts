"use client";

import type { KrChartPeriod } from "@repo/core/marketKr";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { isClientApiError, retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import type { KrOverviewQuery } from "./endpoints";
import { krStockApi } from "./krStockApi";
import { marketQueryKeys } from "./queryKeys";

/**
 * 국내 주식 쿼리(F011 `FE-REQ-041`).
 *
 * - **로그인해야 부른다**(`useHasSession`) — 비회원에게 국내 주식 시세 0건(F011 §정책). 서버 렌더에선 `null` 이라 안 부른다
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

const retryUnlessClientError = retryWhileRetriable(1);

/** 1분 주기 — 4xx(소유자 아님 · 없는 종목)면 멈춘다. 멈추지 않으면 비소유자 화면이 1분마다 404 를 낸다 */
const refreshUnlessClientError = (query: { state: { error: unknown } }) =>
  isClientApiError(query.state.error) ? false : KR_REFRESH_MS;

export const useKrMarketStatus = () => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: marketQueryKeys.krSession,
    queryFn: ({ signal }) => krStockApi.session(signal),
    enabled: signedIn,
    staleTime: KR_STALE_MS,
    refetchInterval: refreshUnlessClientError,
    retry: retryUnlessClientError,
    // 실패한 상태를 새 소비자가 붙을 때마다 다시 부르지 않는다 — 404(소유자 아님)는 다시 불러도 같다. 검색 모달이 열 때마다
    // 붙어 비소유자에게 404 를 매번 냈다(2026-11-09). 5xx 는 위 주기(1분)가 다시 부른다
    retryOnMount: false,
  });
};

/** 쿼리 키 — 실시간 반영(`useKrOverviewRealtime`)이 같은 키로 캐시를 고친다 */
export const krOverviewKey = (query: KrOverviewQuery) =>
  [...marketQueryKeys.krOverview, query.limit, query.offset, query.sort ?? "", query.order ?? "", query.period ?? ""] as const;

export const useKrOverview = (query: KrOverviewQuery, enabled = true) => {
  const signedIn = useHasSession() === true;
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
  const signedIn = useHasSession() === true;
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
  const signedIn = useHasSession() === true;
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

/**
 * 국내 요약 띠(`FE-REQ-050`) — 지수는 서버가 매분 받는다. 표와 같은 1분 주기로 다시 받는다(지수 칸 · 선). 종목 가격은 체결 중계가
 * 고친다(`useKrSummaryRealtime`). 404 · 4xx 면 멈춘다(소유자 아님)
 */
export const useKrMarketSummary = (enabled = true) => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: marketQueryKeys.krSummary,
    queryFn: ({ signal }) => krStockApi.summary(signal),
    enabled: signedIn && enabled,
    staleTime: KR_STALE_MS,
    refetchInterval: refreshUnlessClientError,
    retry: retryUnlessClientError,
  });
};

/** 투자자 순매수 화면 거래일 수 — 표 한 장(2주). 합계도 이 거래일만큼이다(서버가 받은 행으로 낸다) */
export const KR_INVESTOR_DAYS = 10;
/** 하루 한 번(개장일 18:40 KST) 모인다 — 1분마다 받을 이유가 없다 */
const KR_INVESTOR_STALE_MS = 30 * 60_000;

export const useKrInvestors = (code: string, days = KR_INVESTOR_DAYS) => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.krInvestors, code, days],
    queryFn: ({ signal }) => krStockApi.investors(code, days, signal),
    enabled: signedIn && Boolean(code),
    staleTime: KR_INVESTOR_STALE_MS,
    retry: retryUnlessClientError,
  });
};

/**
 * 오늘 소식 2분 — 서버가 시장 전체 제목을 장중(07~20시) 2분마다 받는다. 4xx 면 멈춘다(비소유자 · 없는 종목)
 */
const KR_NEWS_REFRESH_MS = 2 * 60_000;
/** 장중 수급 5분 — 서버가 프로그램 매매를 10분마다 받는다(반 박자로 받아 지연을 반으로) */
const KR_INTRADAY_FLOWS_REFRESH_MS = 5 * 60_000;
const refreshEvery = (ms: number) => (query: { state: { error: unknown } }) =>
  isClientApiError(query.state.error) ? false : ms;

export const useKrNews = (code: string) => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.krNews, code],
    queryFn: ({ signal }) => krStockApi.news(code, signal),
    enabled: signedIn && Boolean(code),
    staleTime: KR_NEWS_REFRESH_MS / 2,
    refetchInterval: refreshEvery(KR_NEWS_REFRESH_MS),
    retry: retryUnlessClientError,
  });
};

/**
 * 오늘 왜 움직였나 2분 — 사실(제목 2분 · 프로그램 10분)과 시세가 계속 바뀐다. 4xx 면 멈춘다(비소유자 · 없는 종목).
 * 국내 · 코인 같은 훅 — 국내는 소유자 판정, 코인은 로그인만(서버 판정)
 */
const WHY_MOVED_REFRESH_MS = 2 * 60_000;

export const useWhyMoved = (target: { kind: "kr"; code: string } | { kind: "crypto"; symbol: string }) => {
  const signedIn = useHasSession() === true;
  const id = target.kind === "kr" ? target.code : target.symbol;
  return useQuery({
    queryKey: [...(target.kind === "kr" ? marketQueryKeys.krWhyMoved : marketQueryKeys.cryptoWhyMoved), id],
    queryFn: ({ signal }) => (target.kind === "kr" ? krStockApi.whyMoved(id, signal) : krStockApi.cryptoWhyMoved(id, signal)),
    enabled: signedIn && Boolean(id),
    staleTime: WHY_MOVED_REFRESH_MS / 2,
    refetchInterval: refreshEvery(WHY_MOVED_REFRESH_MS),
    retry: retryUnlessClientError,
  });
};

export const useKrIntradayFlows = (code: string) => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.krIntradayFlows, code],
    queryFn: ({ signal }) => krStockApi.intradayFlows(code, signal),
    enabled: signedIn && Boolean(code),
    staleTime: KR_INTRADAY_FLOWS_REFRESH_MS / 2,
    refetchInterval: refreshEvery(KR_INTRADAY_FLOWS_REFRESH_MS),
    retry: retryUnlessClientError,
  });
};

/**
 * 호가 10초 — 서버 캐시와 같은 박자라 더 자주 불러도 같은 값이다. 장이 열린 동안만(`live`) 다시 받는다 — 밤 · 휴장엔
 * 호가가 바뀌지 않는다. 화면이 안 보이면 TanStack 이 멈춘다(`refetchIntervalInBackground` 기본 false)
 */
const KR_ORDERBOOK_REFRESH_MS = 10_000;

export const useKrOrderbook = (code: string, live: boolean) => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.krOrderbook, code],
    queryFn: ({ signal }) => krStockApi.orderbook(code, signal),
    enabled: signedIn && Boolean(code),
    staleTime: KR_ORDERBOOK_REFRESH_MS,
    refetchInterval: (query) => (live && !isClientApiError(query.state.error) ? KR_ORDERBOOK_REFRESH_MS : false),
    retry: retryUnlessClientError,
  });
};
