"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import React from "react";
import { PreviewChart } from "@repo/ui/previewChart";
import { Timeframe } from "@/shared/api";

import { useMarketChartPreview } from "../../api";
import { useMarketPreviewChartRealtime } from "../../lib";

export const MarketPreviewChart = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { data, isLoading, isError } = useMarketChartPreview(symbol);

    useMarketPreviewChartRealtime(symbol, Timeframe.FiveMinutes);

    if (isLoading || isError || !data) {
      return null;
    }

    return <PreviewChart symbol={symbol} data={data.data} />;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
MarketPreviewChart.displayName = "MarketPreviewChart";

export default MarketPreviewChart;
