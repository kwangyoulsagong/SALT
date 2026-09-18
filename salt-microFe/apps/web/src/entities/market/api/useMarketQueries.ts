"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";

import {
  MarketChartPreviewResponse,
  MarketIntelligencePreviewResponse,
  MarketOverviewParams,
  MarketOverviewResponse,
  NewsPreviewResponse,
  WatchlistResponse,
} from "../model/types";
import { marketApi } from "./marketApi";
import { marketQueryKeys } from "./queryKeys";

export const useMarketOverview = (
  params: MarketOverviewParams,
): UseQueryResult<MarketOverviewResponse> =>
  useQuery({
    queryKey: [marketQueryKeys.overview, params],
    queryFn: () => marketApi.overview(params),
  });

/**
 * 우측 프리뷰의 두 쿼리는 **심볼이 바뀌어도 이전 데이터를 유지한다.**
 *
 * 프리뷰는 테이블 행 **hover** 로 심볼이 바뀐다. `placeholderData` 가 없으면 새 심볼의
 * 응답이 오기 전까지 `data` 가 `undefined` 이고, 그 동안 차트·지표 컴포넌트가 `null` 을
 * 렌더해 **패널이 비었다가 다시 채워진다** — 그게 "우측 영역이 깜빡인다"의 원인이었다.
 * 패널이 비면 높이가 줄어 페이지 스크롤바가 사라지고, 그 순간 왼쪽 테이블이 밀린다.
 *
 * `staleTime` 을 명시한다 — 기본값 0 이면 창에 포커스가 돌아올 때마다 다시 요청한다
 * (`performance-frontend.md` §6).
 */
const PREVIEW_STALE_TIME_MS = 30_000;

export const useMarketChartPreview = (
  symbol: string,
): UseQueryResult<MarketChartPreviewResponse> =>
  useQuery({
    queryKey: [marketQueryKeys.chartPreview, symbol],
    queryFn: async () => {
      const response = await marketApi.chartPreview(symbol);
      return { ...response, data: [...response.data].reverse() };
    },
    enabled: Boolean(symbol),
    placeholderData: keepPreviousData,
    staleTime: PREVIEW_STALE_TIME_MS,
  });

export const useMarketIntelligencePreview = (
  symbol: string,
): UseQueryResult<MarketIntelligencePreviewResponse> =>
  useQuery({
    queryKey: [marketQueryKeys.intelligencePreview, symbol],
    queryFn: () => marketApi.intelligencePreview(symbol),
    enabled: Boolean(symbol),
    placeholderData: keepPreviousData,
    staleTime: PREVIEW_STALE_TIME_MS,
  });

/**
 * 종목 뉴스.
 *
 * 프리뷰는 종목을 바꿀 때마다 다시 부르므로 프리뷰 쿼리 둘과 **같은 정책**을 쓴다 —
 * 이전 데이터를 유지해 패널이 비었다 채워지지 않게 하고, `staleTime` 으로 포커스마다
 * 다시 요청하지 않게 한다. 뉴스는 시세보다 훨씬 덜 바뀌므로 더 길게 잡는다.
 */
const NEWS_STALE_TIME_MS = 5 * 60_000;

export const useSymbolNews = (
  symbol: string,
  limit: number,
): UseQueryResult<NewsPreviewResponse> =>
  useQuery({
    queryKey: [marketQueryKeys.symbolNews, symbol, limit],
    queryFn: ({ signal }) => marketApi.symbolNews(symbol, limit, signal),
    enabled: Boolean(symbol),
    placeholderData: keepPreviousData,
    staleTime: NEWS_STALE_TIME_MS,
  });

/**
 * 관심 목록.
 *
 * `enabled` 가 토큰 유무다 — 로그인 전에 부르면 401 이 오고, 재시도 대기 동안 화면이
 * "불러오지 못했습니다"를 보여준다. 로그인하지 않은 것은 실패가 아니라 상태다.
 * 토큰이 없을 때 이 훅은 `isPending` 으로 멈춰 있고, 화면이 안내 문구를 고른다.
 *
 * `staleTime` 을 두는 이유는 프리뷰 쿼리와 같다 — 기본값 0 이면 창 포커스마다 다시
 * 요청한다. 값이 바뀌는 지점은 별 토글이고 그때는 mutation 이 무효화한다.
 */
const WATCHLIST_STALE_TIME_MS = 30_000;

export const useWatchlist = (): UseQueryResult<WatchlistResponse> & {
  isSignedOut: boolean;
} => {
  const token = readAccessToken();

  const query = useQuery({
    queryKey: marketQueryKeys.watchlist,
    queryFn: ({ signal }) => marketApi.watchlist(signal),
    enabled: Boolean(token),
    staleTime: WATCHLIST_STALE_TIME_MS,
  });

  return { ...query, isSignedOut: !token } as UseQueryResult<WatchlistResponse> & {
    isSignedOut: boolean;
  };
};
