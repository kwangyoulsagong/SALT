"use client";

import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { type CandleEvent, type Timeframe, wsClient } from "@/shared/api";

import { marketQueryKeys } from "../api/queryKeys";
import type { MarketChartPreviewResponse } from "../model/types";
import { mergeRealtimeCandle } from "./candleTime";

/**
 * 실시간 봉을 차트 쿼리 캐시에 합친다 — 프리뷰 · 상세가 같은 병합을 쓴다(`FE-REQ-034` FR-62 · FR-63).
 * 병합 규칙은 `mergeRealtimeCandle`. `timeframe` 이 `null` 이면 구독하지 않는다(실시간 봉이 없는 기간).
 */
const useChartRealtime = (
  queryKey: QueryKey,
  symbol: string,
  timeframe: Timeframe | null,
): void => {
  const queryClient = useQueryClient();
  // 키는 렌더마다 새 배열이다 — 직렬화해서 effect 의존성으로 쓴다
  const keyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!timeframe || !symbol) return undefined;
    const key = JSON.parse(keyHash) as QueryKey;
    const listener = (data: CandleEvent) => {
      if (data.symbol !== symbol || data.timeframe !== timeframe) return;
      queryClient.setQueryData<MarketChartPreviewResponse>(key, (prev) => {
        if (!prev?.data) return prev;
        const merged = mergeRealtimeCandle(prev.data, data.candle);
        return merged === prev.data ? prev : { ...prev, data: merged };
      });
    };
    return wsClient.subscribeCandle(symbol, timeframe, listener);
  }, [keyHash, symbol, timeframe, queryClient]);
};

/** 우측 프리뷰 차트(5분봉) */
export const useMarketPreviewChartRealtime = (symbol: string, timeframe: Timeframe): void =>
  useChartRealtime([marketQueryKeys.chartPreview, symbol], symbol, timeframe);

/**
 * 상세 분석 차트. 쿼리 키의 기간은 탭 값(`15m` 포함)이고 구독 주기는 WS 가 아는 값이다 — 둘을 따로 받는다
 */
export const useMarketChartRealtime = (
  symbol: string,
  chartTimeframe: string,
  realtime: Timeframe | null,
): void => useChartRealtime([marketQueryKeys.chart, symbol, chartTimeframe], symbol, realtime);
