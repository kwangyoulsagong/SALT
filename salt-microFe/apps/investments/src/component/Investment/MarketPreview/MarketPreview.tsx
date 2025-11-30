import React from "react";

const MarketPreview = React.memo(
  ({ symbol }: { symbol: string }) => {
    return <div>{symbol}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.symbol === nextProps.symbol;
  }
);
export default MarketPreview;
