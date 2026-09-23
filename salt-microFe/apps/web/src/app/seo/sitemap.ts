import type { MetadataRoute } from "next";

import { marketServerApi } from "@/entities/market";
import { ROUTES, SITE_URL } from "@/shared/config";

/** 서버가 주는 시세 목록 전체(2026-09-23 기준 289종목)를 덮는 상한 */
const SITEMAP_SYMBOL_LIMIT = 500;

/**
 * sitemap — 투자 목록 + 종목 상세 전부.
 *
 * 투자 표는 브라우저에서만 그려져(시세가 실시간 WS 로 흐른다) 크롤러가 행의 링크를 보지 못한다.
 * 종목 페이지를 찾는 길은 이 목록이다. 조회가 실패하면 목록 페이지만 싣는다.
 */
export const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const symbols = await marketServerApi.symbols(SITEMAP_SYMBOL_LIMIT);
  const now = new Date();

  return [
    { url: `${SITE_URL}${ROUTES.investments}`, lastModified: now, changeFrequency: "always", priority: 1 },
    ...symbols.map((symbol) => ({
      url: `${SITE_URL}${ROUTES.investmentDetail(symbol)}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
};
