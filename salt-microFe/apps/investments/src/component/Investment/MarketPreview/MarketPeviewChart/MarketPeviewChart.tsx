import React from "react";
import { PreviewChart } from "@repo/ui/previewChart";
import useInvestments from "@/hooks/api/investments/useInvestments";

const MarketPeviewChart = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { investmentsMarketChartPreview } = useInvestments();
    const { data } = investmentsMarketChartPreview(symbol);
    return <PreviewChart symbol={symbol} data={data.data} />;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
export default MarketPeviewChart;
