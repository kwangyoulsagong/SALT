import { backendApi } from "./backend-api.service";
import { toAssetSearchVM, type AssetSearchVM } from "./asset-search.viewmodel";
import { retryOnceOnGet } from "../utils/retry.util";
import {
  toRisingSectorsVM,
  toSearchGroupsVM,
  toSearchRelatedVM,
  type RisingSectorsVM,
  type SearchGroupsVM,
  type SearchRelatedVM,
} from "./search-extras.viewmodel";

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

/**
 * 검색 모달 2단계(`BFF-REQ-054` · 서버 `SRV-REQ-055`) 예산 — 서버 실측 10ms 안팎(2026-11-10, 국내 포함). 타이핑마다 · 고른 행마다
 * 부르므로 검색과 같은 400ms. **캐시하지 않는다** — 서버가 10ms 안팎이라 이득이 없다(~~국내 칸 소유자 판정~~ 2026-11-10 걷음)
 */
const SEARCH_EXTRAS_TIMEOUT_MS = 400;

export type SearchRelatedTarget = { assetType: "crypto" | "kr_stock"; symbol: string } | { sector: string };

class AppSearchExtrasService {
  private async get(token: string, path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await retryOnceOnGet(
      () => backendApi.proxyAuthRequest("GET", path, token, undefined, { timeout: SEARCH_EXTRAS_TIMEOUT_MS, signal }),
      signal,
    );
    return (response.data as { data?: unknown })?.data;
  }

  /** 업종 · 지수 · 뉴스 묶음 — 검색어는 로그에 남지 않는다(요청 로그는 `loggableUrl` 이 가린다) */
  async groups(token: string, q: string, signal?: AbortSignal): Promise<SearchGroupsVM> {
    return toSearchGroupsVM(await this.get(token, `/investment/search/groups?${new URLSearchParams({ q })}`, signal));
  }

  async risingSectors(token: string, limit: number, signal?: AbortSignal): Promise<RisingSectorsVM> {
    return toRisingSectorsVM(await this.get(token, `/investment/search/rising-sectors?limit=${limit}`, signal));
  }

  async related(token: string, target: SearchRelatedTarget, signal?: AbortSignal): Promise<SearchRelatedVM> {
    const params = new URLSearchParams("sector" in target ? { sector: target.sector } : target);
    return toSearchRelatedVM(await this.get(token, `/investment/search/related?${params}`, signal));
  }
}

export const appSearchExtrasService = new AppSearchExtrasService();
