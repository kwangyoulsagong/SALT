import axios from "axios";

import { authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import {
  MarketChartPreviewResponse,
  MarketIntelligencePreviewResponse,
  MarketOverviewParams,
  MarketOverviewResponse,
  MarketSymbolNewsItem,
  MarketSymbolNewsParams,
  WatchlistResponse,
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
  /**
   * 관심 목록. **인증이 필요하다** — 토큰이 없으면 BFF 가 401 을 준다.
   *
   * 부르는 쪽(`useWatchlist`)이 토큰 유무로 `enabled` 를 정한다. 여기서 던지지 않는
   * 이유는 "로그인 안 됨"이 오류가 아니라 **상태**이기 때문이다.
   */
  watchlist: async (signal?: AbortSignal): Promise<WatchlistResponse> => {
    const response = await axios.get<WatchlistResponse>(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.watchlist()}`,
      { headers: authHeader(), signal },
    );
    return response.data;
  },
};
