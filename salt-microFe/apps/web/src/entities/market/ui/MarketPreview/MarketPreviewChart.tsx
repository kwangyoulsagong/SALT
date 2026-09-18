"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { PreviewChart } from "@repo/ui/previewChart";
import { Skeleton } from "@repo/ui/skeleton";
import React from "react";

import { Timeframe } from "@/shared/api";

import { useMarketChartPreview } from "../../api";
import { useMarketPreviewChartRealtime } from "../../lib";

/** `PreviewChart` 의 기본 높이. 자리표시자가 같은 높이를 잡아 첫 로딩에서 밀리지 않는다. */
const CHART_HEIGHT = 210;

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
export const MarketPreviewChart = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { data, isLoading, isError } = useMarketChartPreview(symbol);

    useMarketPreviewChartRealtime(symbol, Timeframe.FiveMinutes);

    if (isLoading) {
      return <Skeleton height={CHART_HEIGHT} />;
    }

    if (isError || !data) {
      return null;
    }

    return <PreviewChart symbol={symbol} data={data.data} />;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
MarketPreviewChart.displayName = "MarketPreviewChart";

export default MarketPreviewChart;
