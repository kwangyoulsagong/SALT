import axios from "axios";

import { authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import {
  MarketChartPreviewResponse,
  MarketIntelligencePreviewResponse,
  MarketOverviewParams,
  MarketOverviewResponse,
  NewsPreviewResponse,
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
  /**
   * 종목 뉴스. **인증이 필요 없다** — 서버 `/news` 가 공개 경로이고 BFF 도 그대로 뒀다.
   *
   * 이 함수는 원래 **던지는 스텁**이었다(`marketSymbolNews is not implemented`).
   * 화면이 상수를 그리고 있어서 부르는 곳이 없었다 (`FE-REQ-010` FR-3).
   */
  symbolNews: async (
    symbol: string,
    limit: number,
    signal?: AbortSignal,
  ): Promise<NewsPreviewResponse> => {
    const response = await axios.get<NewsPreviewResponse>(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.symbolNews(symbol, limit)}`,
      { signal },
    );
    return response.data;
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
