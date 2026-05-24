import React from "react";
import { PreviewChart } from "@repo/ui/previewChart";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { useMarketPreviewChartRealtime } from "@/hooks/investments/useMarketPreviewChartRealtime";

const MarketPeviewChart = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { investmentsMarketChartPreview } = useInvestments();
    const { data } = investmentsMarketChartPreview(symbol);

    useMarketPreviewChartRealtime(symbol, "5m");
    return <PreviewChart symbol={symbol} data={data.data} />;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
export default MarketPeviewChart;
