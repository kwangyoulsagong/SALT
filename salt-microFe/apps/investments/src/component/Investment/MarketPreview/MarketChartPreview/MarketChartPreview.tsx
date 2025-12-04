import TradingViewChart from "@/component/TradingViewChart/TradingViewChart";
import useInvestments from "@/hooks/api/investments/useInvestments";
import React from "react";

const MarketChartPreview = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { investmentsMarketChartPreview } = useInvestments();
    const { data } = investmentsMarketChartPreview(symbol);
    return <TradingViewChart symbol={symbol} data={data} />;
  },
  (prevProps, nextProps) => prevProps.symbol === nextProps.symbol
);
export default MarketChartPreview;
