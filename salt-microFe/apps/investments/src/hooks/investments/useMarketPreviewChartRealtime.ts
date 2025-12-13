import { MarketChartPreviewResponse } from "@/api/investments/investments";
import { querykeys } from "@/constants/queryKeys";
import { Timeframe } from "@/libs/webSocketClient/type/webSokcetClient.type";
import { wsClient } from "@/libs/webSocketClient/webSocketClient";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useMarketPreviewChartRealtime = (
  symbol: string,
  timeframe: Timeframe
) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const listener = (data: {
      symbol: string;
      timeframe: Timeframe;
      candle: {
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      };
    }) => {
      if (data.symbol !== symbol || data.timeframe !== timeframe) return;
      queryClient.setQueryData(
        [querykeys.MarketChartPreview, symbol],
        (prev: MarketChartPreviewResponse): MarketChartPreviewResponse => {
          if (!prev?.data) return prev;
          const lastCandleData = prev.data[prev.data.length - 1];
          if (lastCandleData.timestamp === data.candle.timestamp) {
            const next = [...prev.data];
            next[prev.data.length - 1] = data.candle;
            return { ...prev, data: next };
          }
          return {
            ...prev,
            data: [...prev.data.slice(1), data.candle],
          };
        }
      );
    };
    wsClient.subscribeCandle(symbol, timeframe, listener);
    return () => {
      wsClient.unsubscribeCandle(symbol, timeframe, listener);
    };
  }, [symbol, queryClient, timeframe]);
};
