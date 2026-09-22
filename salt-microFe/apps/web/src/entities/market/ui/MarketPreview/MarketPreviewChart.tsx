"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import {
  type PriceBand,
  type PriceLine,
  PreviewChart,
} from "@repo/ui/previewChart";
import { Skeleton } from "@repo/ui/skeleton";
import React from "react";

import { Timeframe } from "@/shared/api";
import { useElementWidth } from "@/shared/lib";

import { useMarketChartPreview } from "../../api";
import { useMarketPreviewChartRealtime } from "../../lib";
import { chartMeasure } from "./MarketPreviewChart.css";

/** `PreviewChart` 의 기본 높이. 자리표시자가 같은 높이를 잡아 첫 로딩에서 밀리지 않는다. */
const CHART_HEIGHT = 210;

/**
 * 폭을 재기 전의 차트 폭 = `PreviewChart` 의 기본 폭.
 *
 * 차트는 폭을 **숫자로** 받아 SVG 좌표를 계산한다. 고정값을 그대로 쓰면 프리뷰가
 * 이보다 좁아질 때(1280px 화면 ≈ 322px · 모바일) 차트가 120~150px 튀어나와 프리뷰가
 * 가로로 스크롤됐다(2026-09-21 실측). 부모 폭을 재서 넘긴다.
 */
const CHART_FALLBACK_WIDTH = 447;

/**
 * 프리뷰 차트.
 *
 * ## 심볼이 바뀔 때 비우지 않는다
 *
 * 쿼리가 `keepPreviousData` 라(`api/useMarketQueries.ts`) hover 로 심볼이 바뀌어도
 * `data` 가 유지된다. 그래서 여기서 `null` 로 떨어지는 경우는 **첫 로딩과 실패뿐**이고,
 * 첫 로딩에는 실제 차트와 같은 높이의 자리표시자를 둔다
 * (`performance-frontend.md` §4 — 스켈레톤 높이 = 실제 블록 높이).
 *
 * 차트 인스턴스는 심볼이 바뀌어도 **재사용된다** — `key` 를 주지 않으므로 데이터만
 * 교체된다(같은 문서 §3).
 */
/**
 * 차트 위에 얹는 선 · 띠. **시세 슬라이스는 이것이 무엇인지 모른다** — 코치 구간을 바꿔 넣는 것은
 * 위 레이어다(`MarketPreview` `coachSlot` 과 같은 이유).
 */
export interface MarketChartOverlay {
  priceLines: readonly PriceLine[];
  priceBand: PriceBand | null;
}

export const MarketPreviewChart = React.memo(
  ({ symbol, overlay }: { symbol: string; overlay?: MarketChartOverlay }) => {
    const { data, isLoading, isError } = useMarketChartPreview(symbol);
    const [containerRef, width] =
      useElementWidth<HTMLDivElement>(CHART_FALLBACK_WIDTH);

    useMarketPreviewChartRealtime(symbol, Timeframe.FiveMinutes);

    // 측정용 상자는 **로딩·실패와 상관없이 늘 있다** — 없으면 첫 측정이 데이터 도착
    // 뒤로 밀려, 차트가 한 번 고정 폭으로 그려졌다가 줄어든다.
    return (
      <div ref={containerRef} className={chartMeasure}>
        {isLoading ? (
          <Skeleton height={CHART_HEIGHT} />
        ) : isError || !data ? null : (
          <PreviewChart
            symbol={symbol}
            data={data.data}
            width={width}
            priceLines={overlay?.priceLines}
            priceBand={overlay?.priceBand}
          />
        )}
      </div>
    );
  },
  // 덮개는 부르는 쪽이 memo 로 넘긴다 — 참조가 같으면 다시 그리지 않는다
  (prevProps, nextProps) =>
    prevProps.symbol === nextProps.symbol &&
    prevProps.overlay === nextProps.overlay,
);
MarketPreviewChart.displayName = "MarketPreviewChart";

export default MarketPreviewChart;
