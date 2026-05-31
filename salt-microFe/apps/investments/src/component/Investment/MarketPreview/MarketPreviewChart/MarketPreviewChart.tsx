import React from "react";
import { PreviewChart } from "@repo/ui/previewChart";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { useMarketPreviewChartRealtime } from "@/hooks/investments/useMarketPreviewChartRealtime";

const MarketPreviewChart = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { investmentsMarketChartPreview } = useInvestments();
    const { data, isLoading, isError } = investmentsMarketChartPreview(symbol);

    useMarketPreviewChartRealtime(symbol, "5m");

    if (isLoading || isError || !data) {
      return null;
    }

    return <PreviewChart symbol={symbol} data={data.data} />;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
MarketPreviewChart.displayName = "MarketPreviewChart";

export default MarketPreviewChart;
