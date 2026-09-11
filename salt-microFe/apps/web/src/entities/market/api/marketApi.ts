import axios from "axios";

import { INVESTMENTS_BASE_URL } from "@/shared/config";

import {
  MarketChartPreviewResponse,
  MarketIntelligencePreviewResponse,
  MarketOverviewParams,
  MarketOverviewResponse,
  MarketSymbolNewsItem,
  MarketSymbolNewsParams,
} from "../model/types";
import { MARKET_ENDPOINTS } from "./endpoints";

/** 조회만 둔다. mutation 은 `features/{slice}/api` 로 올린다 (`fsd-entities.md`). */
export const marketApi = {
  overview: async (
    params: MarketOverviewParams,
  ): Promise<MarketOverviewResponse> => {
    const response = await axios.get(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.overview(params)}`,
    );
    return response.data;
  },
  chartPreview: async (symbol: string): Promise<MarketChartPreviewResponse> => {
    const response = await axios.get(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.chartPreview(symbol)}`,
    );
    return response.data;
  },
  intelligencePreview: async (
    symbol: string,
  ): Promise<MarketIntelligencePreviewResponse> => {
    const response = await axios.get(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.intelligencePreview(symbol)}`,
    );
    return response.data;
  },
  symbolNews: async ({
    symbol,
  }: MarketSymbolNewsParams): Promise<MarketSymbolNewsItem> => {
    throw new Error(`marketSymbolNews is not implemented for ${symbol}`);
  },
};
