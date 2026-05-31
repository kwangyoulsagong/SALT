import React from "react";
import { PreviewChart } from "@repo/ui/previewChart";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { useMarketPreviewChartRealtime } from "@/hooks/investments/useMarketPreviewChartRealtime";

const MarketPeviewChart = React.memo(
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
MarketPeviewChart.displayName = "MarketPeviewChart";

export default MarketPeviewChart;
