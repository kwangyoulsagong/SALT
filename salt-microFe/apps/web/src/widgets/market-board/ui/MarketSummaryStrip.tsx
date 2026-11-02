"use client";

import type { KrScheduleItem } from "@repo/core/marketKr";
import { useMemo } from "react";

import {
  MARKET_SUMMARY_MESSAGES,
  MarketAssetClass,
  MarketBriefingPanel,
  MarketBriefingPanelSkeleton,
  MarketSummaryFeatured,
  MarketSummaryFeaturedSkeleton,
  type MarketSummaryItem,
  MarketSummaryItemLink,
  MarketSummaryItemSkeleton,
  type MarketBreadth,
  type MarketSummaryHeadline,
  SummaryChangeBasis,
  SummaryItemKind,
  toMarketSummaryItem,
  useKrMarketSummary,
  useKrSummaryRealtime,
  useMarketSummary,
  useMarketSummaryRealtime,
} from "@/entities/market";
import { ROUTES } from "@/shared/config";

import { featuredCell, itemGrid, panelCell, strip } from "./MarketSummaryStrip.css";

/** 불러오는 동안 그리는 작은 항목 수 — 3열 × 3줄(서버 기본 설정) */
const ITEM_SKELETON_COUNT = 9;

/** 띠가 그리는 것 — 코인 · 국내가 같은 모양으로 모인다. 값은 서버 · BFF 것 그대로 */
interface StripData {
  featured: MarketSummaryItem | null;
  items: MarketSummaryItem[];
  windowLabel: string;
  breadth: MarketBreadth | null;
  headlines: MarketSummaryHeadline[];
  schedule: KrScheduleItem[];
  changeBasis: SummaryChangeBasis;
  regionLabel: string;
}

/** 오늘(KST) — 스파크라인이 그린 날과 견줘 "오늘 장중" 을 고른다. 렌더가 아니라 데이터가 바뀔 때만 센다 */
const kstToday = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);

/** 코인 요약(`FE-REQ-037`) — 가격은 업비트 WS 로 고친다 */
const useCryptoStrip = (enabled: boolean): { data: StripData | undefined; isPending: boolean; isError: boolean } => {
  const query = useMarketSummary(enabled);
  const data = query.data;
  const symbols = useMemo(
    () => (data ? [...(data.featured ? [data.featured] : []), ...data.items].map((item) => item.symbol) : []),
    [data],
  );
  useMarketSummaryRealtime(enabled ? symbols : []);
  const strip = useMemo<StripData | undefined>(
    () =>
      data && {
        featured: data.featured,
        items: data.items,
        windowLabel: MARKET_SUMMARY_MESSAGES.recentWindow(MARKET_SUMMARY_MESSAGES.windowLabel(data.sparklineWindowMinutes)),
        breadth: data.breadth,
        headlines: data.headlines,
        schedule: [],
        changeBasis: SummaryChangeBasis.Last24h,
        regionLabel: MARKET_SUMMARY_MESSAGES.regionLabel,
      },
    [data],
  );
  return { data: strip, isPending: query.isPending, isError: query.isError };
};

/**
 * 국내 요약(`FE-REQ-050`) — 종목 칸 가격은 국내 체결 중계로, 지수 칸은 1분 재조회로. `disabled` · `unavailable` 은 오류와 같이
 * 띠를 그리지 않는다(FR-6)
 */
const useKrStrip = (enabled: boolean): { data: StripData | undefined; isPending: boolean; isError: boolean } => {
  const query = useKrMarketSummary(enabled);
  const ok = query.data?.status === "ok" ? query.data : undefined;
  const codes = useMemo(
    () => (ok ? ok.items.filter((item) => item.kind === "stock").map((item) => item.symbol) : []),
    [ok],
  );
  useKrSummaryRealtime(enabled ? codes : []);
  const strip = useMemo<StripData | undefined>(
    () =>
      ok && {
        featured: ok.featured && toMarketSummaryItem(ok.featured),
        items: ok.items.map(toMarketSummaryItem),
        windowLabel: MARKET_SUMMARY_MESSAGES.sessionWindow(ok.sparklineDate, kstToday()),
        breadth: ok.breadth,
        headlines: [],
        schedule: ok.schedule,
        changeBasis: SummaryChangeBasis.PrevClose,
        regionLabel: MARKET_SUMMARY_MESSAGES.krRegionLabel,
      },
    [ok],
  );
  return {
    data: strip,
    isPending: query.isPending,
    isError: query.isError || (query.data !== undefined && query.data.status !== "ok"),
  };
};

/** 지수 칸은 상세 화면이 없다 — 링크 없음(FR-2) */
const hrefOf = (item: MarketSummaryItem) =>
  item.kind === SummaryItemKind.Index ? undefined : ROUTES.investmentDetail(item.symbol);

interface MarketSummaryStripProps {
  /**
   * 자산군(`MarketAssetClass` 값) — 데이터 소스만 바뀌고 띠는 같다(`market-board` 원칙, `FE-REQ-050` FR-1). 문자열로 받는다 —
   * 보드가 엔티티 barrel 을 값으로 끌어오지 않게(`model/index.ts` 주석)
   */
  assetClass?: string;
}

/**
 * 시장 요약 띠 (`FE-REQ-037` · `FEATURE-006` FR-64~67 · 국내 `FE-REQ-050`). 대표 1 + 작은 항목(3줄씩 열) + 오늘의 시장 상자.
 *
 * **무엇을 보여 줄지는 서버가 정한다**(`SRV-REQ-036` · `SRV-REQ-042` 설정) — 종목 · 순서 · 태그 · 등락 금액 · 스파크라인이
 * 응답 하나로 온다. 이 위젯은 배치만 한다. 가격은 실시간으로 고친다 — 관심 종목 탭에 있어도.
 *
 * 조회 실패면 **아무것도 그리지 않는다**(FR-8) — 띠는 부가 정보이고 표가 본문이다.
 */
export const MarketSummaryStrip = ({ assetClass = MarketAssetClass.Crypto }: MarketSummaryStripProps) => {
  const isKr = assetClass === MarketAssetClass.KrStock;
  // 두 훅을 늘 부르고 한쪽만 켠다 — 훅 순서가 탭에 따라 바뀌지 않게
  const crypto = useCryptoStrip(!isKr);
  const kr = useKrStrip(isKr);
  const { data, isPending, isError } = isKr ? kr : crypto;

  if (isError) return null;

  if (isPending || !data) {
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
        <div className={panelCell}>
          <MarketBriefingPanelSkeleton />
        </div>
      </div>
    );
  }

  return (
    <section className={strip} aria-label={data.regionLabel}>
      <div className={featuredCell}>
        {data.featured ? (
          <MarketSummaryFeatured
            item={data.featured}
            windowLabel={data.windowLabel}
            href={hrefOf(data.featured)}
            changeBasis={data.changeBasis}
          />
        ) : null}
      </div>
      <div className={itemGrid}>
        {data.items.map((item) => (
          <MarketSummaryItemLink
            key={item.symbol}
            item={item}
            windowLabel={data.windowLabel}
            href={hrefOf(item)}
            changeBasis={data.changeBasis}
          />
        ))}
      </div>
      <div className={panelCell}>
        <MarketBriefingPanel
          breadth={data.breadth}
          headlines={data.headlines}
          featuredName={data.featured?.name ?? null}
          schedule={data.schedule}
          changeBasis={data.changeBasis}
        />
      </div>
    </section>
  );
};

export default MarketSummaryStrip;
