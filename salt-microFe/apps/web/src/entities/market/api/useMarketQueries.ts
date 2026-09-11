"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

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
  });

export const useMarketIntelligencePreview = (
  symbol: string,
): UseQueryResult<MarketIntelligencePreviewResponse> =>
  useQuery({
    queryKey: [marketQueryKeys.intelligencePreview, symbol],
    queryFn: () => marketApi.intelligencePreview(symbol),
    enabled: Boolean(symbol),
  });
