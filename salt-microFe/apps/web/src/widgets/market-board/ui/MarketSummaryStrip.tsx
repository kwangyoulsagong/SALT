"use client";

import { useMemo } from "react";

import {
  MARKET_SUMMARY_MESSAGES,
  MarketSummaryFeatured,
  MarketSummaryFeaturedSkeleton,
  MarketSummaryItemLink,
  MarketSummaryItemSkeleton,
  useMarketSummary,
  useMarketSummaryRealtime,
} from "@/entities/market";
import { ROUTES } from "@/shared/config";

import { featuredCell, itemGrid, strip } from "./MarketSummaryStrip.css";

/** 불러오는 동안 그리는 작은 항목 수 — 2열 × 3줄 */
const ITEM_SKELETON_COUNT = 6;

/**
 * 시장 요약 띠 (`FE-REQ-037` · `FEATURE-006` FR-64~67). 대표 1 + 작은 항목(3줄씩 열).
 *
 * **무엇을 보여 줄지는 서버가 정한다**(`SRV-REQ-036` 설정) — 종목 · 순서 · 태그 · 등락 금액 · 스파크라인이
 * 응답 하나로 온다. 이 위젯은 배치만 한다. 가격은 WS 로 갱신한다 — 관심 종목 탭에 있어도.
 *
 * 조회 실패면 **아무것도 그리지 않는다**(FR-8) — 띠는 부가 정보이고 표가 본문이다.
 */
export const MarketSummaryStrip = () => {
  const { data, isPending, isError } = useMarketSummary();

  const symbols = useMemo(
    () =>
      data
        ? [...(data.featured ? [data.featured] : []), ...data.items].map((item) => item.symbol)
        : [],
    [data],
  );
  useMarketSummaryRealtime(symbols);

  if (isError) return null;

  if (isPending) {
    return (
      <div className={strip} aria-hidden="true">
        <div className={featuredCell}>
          <MarketSummaryFeaturedSkeleton />
        </div>
        <div className={itemGrid}>
          {Array.from({ length: ITEM_SKELETON_COUNT }, (_, index) => (
            <MarketSummaryItemSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className={strip} aria-label={MARKET_SUMMARY_MESSAGES.regionLabel}>
      <div className={featuredCell}>
        {data.featured ? (
          <MarketSummaryFeatured
            item={data.featured}
            windowMinutes={data.sparklineWindowMinutes}
            href={ROUTES.investmentDetail(data.featured.symbol)}
          />
        ) : null}
      </div>
      <div className={itemGrid}>
        {data.items.map((item) => (
          <MarketSummaryItemLink
            key={item.symbol}
            item={item}
            windowMinutes={data.sparklineWindowMinutes}
            href={ROUTES.investmentDetail(item.symbol)}
          />
        ))}
      </div>
    </section>
  );
};

export default MarketSummaryStrip;
