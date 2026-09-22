import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type { ChartTimeframeSpec } from "../model/chartTimeframes";
import {
  MarketChartPreviewResponse,
  MarketChartRawItem,
  MarketIntelligencePreviewResponse,
  MarketOverviewParams,
  MarketOverviewResponse,
  NewsPreviewResponse,
  WatchlistResponse,
} from "../model/types";
import { MARKET_ENDPOINTS } from "./endpoints";

/** 상태 코드를 들고 던진다 — 재시도 판단이 4xx 와 5xx 를 가른다(`CoachApiError` 와 같다) */
export class MarketApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`market ${endpoint} ${status}`);
  }
}

/**
 * GET 후 본문을 그대로 돌려준다. 실패는 `MarketApiError` 로 던진다 — 예전 `axios.get` 의
 * "2xx 가 아니면 던진다"와 같은 계약이라 부르는 훅은 바뀌지 않는다.
 */
const getJson = async <T>(
  endpoint: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${path}`, init);
  if (!response.ok) throw new MarketApiError(endpoint, response.status);
  return (await response.json()) as T;
};

/**
 * 조회만 둔다. mutation 은 `features/{slice}/api` 로 올린다 (`fsd-entities.md`).
 *
 * **전부 `apiFetch` 다.** 이 파일은 `axios` 를 직접 불러 번들 회귀를 세 번 냈다
 * (`FE-REQ-010` · `FE-REQ-012` 회고). 이제 `no-restricted-imports` 가 `axios` 를 막는다(`FE-REQ-035`).
 */
export const marketApi = {
  overview: async (
    params: MarketOverviewParams,
  ): Promise<MarketOverviewResponse> => {
    return getJson("overview", MARKET_ENDPOINTS.overview(params));
  },
  chartPreview: async (symbol: string): Promise<MarketChartPreviewResponse> => {
    return getJson("chartPreview", MARKET_ENDPOINTS.chartPreview(symbol));
  },
  /** 상세 분석 차트. 캔들은 **최신이 앞**으로 온다 — 뒤집는 것은 훅이 한다(프리뷰와 같다). */
  chart: async (
    symbol: string,
    spec: ChartTimeframeSpec,
    count: number,
    signal?: AbortSignal,
  ): Promise<MarketChartPreviewResponse> => {
    const body = await getJson<{ data: MarketChartRawItem[] }>(
      "chart",
      MARKET_ENDPOINTS.chart(symbol, spec, count),
      { signal },
    );
    // 일봉은 `date`, 분봉은 `timestamp` — 한 키로 맞춘다(슬라이스 6 의 일봉 탭이 이것 때문에 시각이 NaN 이었다)
    return {
      data: body.data.map(({ date, timestamp, ...rest }) => ({
        ...rest,
        timestamp: timestamp ?? date ?? "",
      })),
    };
  },
  intelligencePreview: async (
    symbol: string,
  ): Promise<MarketIntelligencePreviewResponse> => {
    return getJson(
      "intelligencePreview",
      MARKET_ENDPOINTS.intelligencePreview(symbol),
    );
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
    return getJson("symbolNews", MARKET_ENDPOINTS.symbolNews(symbol, limit), {
      signal,
    });
  },
  /**
   * 관심 목록. **인증이 필요하다** — 토큰이 없으면 BFF 가 401 을 준다.
   *
   * 부르는 쪽(`useWatchlist`)이 토큰 유무로 `enabled` 를 정한다. 여기서 던지지 않는
   * 이유는 "로그인 안 됨"이 오류가 아니라 **상태**이기 때문이다.
   */
  watchlist: async (signal?: AbortSignal): Promise<WatchlistResponse> => {
    return getJson("watchlist", MARKET_ENDPOINTS.watchlist(), {
      headers: authHeader(),
      signal,
    });
  },
};
