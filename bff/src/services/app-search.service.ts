import { backendApi } from "./backend-api.service";
import { toAssetSearchVM, type AssetSearchVM } from "./asset-search.viewmodel";
import { retryOnceOnGet } from "../utils/retry.util";

/**
 * 서버 검색 예산 — 호출 맵(`BFF-REQ-009` `searchAssets` 400ms · 재시도 1회). 실측 서버 응답 11~27ms(2026-10-30, 임시 사용자 ·
 * 국내 포함). 검색은 타이핑 중 다시 부르므로 길게 기다리지 않는다
 */
const SEARCH_TIMEOUT_MS = 400;

export interface AssetSearchQuery {
  q: string;
  assetType?: "crypto" | "kr_stock";
  limit: number;
}

/**
 * 종목 검색(`BFF-REQ-007` H절). **캐시하지 않는다** — `isTracked` 가 사용자별 판정이다(FR-72). 4xx 는 error middleware 가
 * 원 status · code 그대로 옮긴다. 검색어는 로그에 남기지 않는다(요청 로그는 `loggableUrl` 이 가린다)
 */
class AppSearchService {
  async search(token: string, query: AssetSearchQuery, signal?: AbortSignal): Promise<AssetSearchVM> {
    const params = new URLSearchParams({ q: query.q, limit: String(query.limit) });
    if (query.assetType) params.set("assetType", query.assetType);
    const response = await retryOnceOnGet(
      () =>
        backendApi.proxyAuthRequest("GET", `/investment/search?${params.toString()}`, token, undefined, {
          timeout: SEARCH_TIMEOUT_MS,
          signal,
        }),
      signal,
    );
    return toAssetSearchVM((response.data as { data?: unknown })?.data);
  }
}

export const appSearchService = new AppSearchService();
