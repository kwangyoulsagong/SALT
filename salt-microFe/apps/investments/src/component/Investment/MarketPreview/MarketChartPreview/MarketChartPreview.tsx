import useInvestments from "@/hooks/api/investments/useInvestments";
import React from "react";

const MarketChartPreview = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { investmentsMarketChartPreview } = useInvestments();
    const { data } = investmentsMarketChartPreview(symbol);
    console.log(data);
    return <div>{symbol}</div>;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
export default MarketChartPreview;
