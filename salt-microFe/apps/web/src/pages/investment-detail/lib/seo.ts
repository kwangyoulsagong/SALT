import type { Metadata } from "next";

import type { MarketOverviewItem } from "@/entities/market";
import { ROUTES, SITE_NAME, SITE_URL } from "@/shared/config";
import { formatPrice } from "@/shared/lib";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as MESSAGES } from "../model";

const MINUS = "−";

/** 24시간 변동률(%) → `+0.8%` · `−1.2%`. 서버 값의 표시 포맷이다 */
const formatChange = (percent: number): string => {
  const fixed = Math.abs(percent).toFixed(2);
  if (Number(fixed) === 0) return "0.00%";
  return `${percent > 0 ? "+" : MINUS}${fixed}%`;
};

/**
 * 종목 상세 메타데이터 — 제목 · 설명 · canonical · Open Graph.
 *
 * canonical 에 `?mode=` 를 싣지 않는다 — 모드는 같은 페이지의 보기 상태라 주소가 둘이면 색인이
 * 갈린다. 시세를 못 받으면 심볼만으로 만든다(메타데이터가 비었다고 페이지가 깨지면 안 된다).
 */
export const buildDetailMetadata = (
  symbol: string,
  listing: MarketOverviewItem | null,
): Metadata => {
  const upper = symbol.toUpperCase();
  const path = ROUTES.investmentDetail(upper);
  const title = listing
    ? MESSAGES.metaTitle(listing.koreanName, upper)
    : MESSAGES.metaTitleFallback(upper);
  const description = listing
    ? MESSAGES.metaDescription(
        listing.koreanName,
        formatPrice(listing.currentPrice),
        formatChange(listing.change24h),
      )
    : MESSAGES.metaDescriptionFallback(upper);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      title: `${title} | ${SITE_NAME}`,
      description,
      ...(listing?.logoUrl ? { images: [{ url: listing.logoUrl, alt: listing.koreanName }] } : {}),
    },
  };
};

/** 이동 경로 구조화 데이터(JSON-LD) — 검색 결과에 "코인 시세 › 비트코인" 으로 보인다 */
export const buildDetailBreadcrumb = (symbol: string, listing: MarketOverviewItem | null) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: MESSAGES.breadcrumbInvestments,
      item: `${SITE_URL}${ROUTES.investments}`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: listing?.koreanName ?? symbol.toUpperCase(),
      item: `${SITE_URL}${ROUTES.investmentDetail(symbol.toUpperCase())}`,
    },
  ],
});
