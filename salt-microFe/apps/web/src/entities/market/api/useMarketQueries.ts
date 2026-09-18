"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  MarketChartPreviewResponse,
  MarketIntelligencePreviewResponse,
  MarketOverviewParams,
  MarketOverviewResponse,
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
