import type { MarketOverviewItem, MarketOverviewResponse } from "@/entities/market";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

/**
 * **서버 컴포넌트 · 메타데이터 · sitemap 전용** 시세 조회 — 공개 시세라 토큰이 필요 없다.
 *
 * ## 왜 `entities/market` 가 아니라 이 페이지 슬라이스인가
 *
 * 서버 페이지가 `@/entities/market` 배럴을 값으로 가져오면, 배럴의 `"use client"` 모듈(미리보기
 * 패널 · 차트 로더)이 전부 이 페이지의 클라이언트 경계가 된다 — 첫 로드 110 → 161 kB(2026-09-23 실측).
 * 그래서 서버 조회는 부르는 쪽(이 페이지)이 갖고 배럴에서는 **타입만** 가져온다.
 *
 * `apiFetch`(토큰 갱신 · 브라우저 세션)를 거치지 않는 맨 `fetch` 다. 서버에서는 세션이 없고,
 * Next 의 데이터 캐시(`revalidate`)를 쓰려면 `fetch` 에 옵션을 직접 줘야 한다.
 *
 * 실패는 `null` · 빈 배열이다 — 메타데이터가 비었다고 페이지가 깨지면 안 된다. 화면 본문은
 * 브라우저에서 다시 부른다.
 */
const LISTING_REVALIDATE_SECONDS = 30;
const SITEMAP_REVALIDATE_SECONDS = 60 * 60;
/** 한 종목 찾기 — 검색 결과 앞쪽만 본다(`useMarketListing` 과 같은 규칙) */
const LISTING_SEARCH_LIMIT = 20;

/** 시세 목록 경로 — `entities/market` 의 `MARKET_ENDPOINTS.overview` 와 같은 upstream */
const overviewPath = ({ page, limit, search }: { page: number; limit: number; search?: string }) =>
  `/api/investment/market/overview?page=${page}&limit=${limit}` +
  `&search=${encodeURIComponent(search ?? "")}`;

const fetchOverview = async (
  params: { page: number; limit: number; search?: string },
  revalidate: number,
): Promise<MarketOverviewItem[]> => {
  try {
    const response = await fetch(`${INVESTMENTS_BASE_URL}${overviewPath(params)}`, {
      next: { revalidate },
    });
    if (!response.ok) return [];
    const body = (await response.json()) as MarketOverviewResponse;
    return Array.isArray(body.items) ? body.items : [];
  } catch {
    return [];
  }
};

export const publicMarketApi = {
  /** 종목 하나 — 상세 페이지 헤더 · 메타데이터 */
  listing: async (symbol: string): Promise<MarketOverviewItem | null> => {
    const target = symbol.toUpperCase();
    const items = await fetchOverview(
      { page: 1, limit: LISTING_SEARCH_LIMIT, search: symbol },
      LISTING_REVALIDATE_SECONDS,
    );
    return items.find((item) => item.symbol.toUpperCase() === target) ?? null;
  },

  /** sitemap 에 올릴 종목 심볼 — 서버가 정한 목록 순서 그대로 */
  symbols: async (limit: number): Promise<string[]> => {
    const items = await fetchOverview({ page: 1, limit }, SITEMAP_REVALIDATE_SECONDS);
    return items.map((item) => item.symbol);
  },
};
