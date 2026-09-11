import {
  MarketOverviewItem,
  MarketOverviewParams,
  MarketOverviewResponse,
} from "@/api/investments/investments";
import { querykeys } from "@/constants/queryKeys";
import { wsClient } from "@/libs/webSocketClient/webSocketClient";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useMarketOverviewRealtime = (
  params: MarketOverviewParams,
  symbols: string[],
  onBlink?: (symbol: string) => void
) => {
  const queryClient = useQueryClient();
  // 심볼 목록을 값 기준 키로 만든다.
  // 첫 마운트엔 데이터가 없어 symbols가 비어 있고, 데이터가 도착해 symbols가
  // 채워지면 symbolsKey가 바뀌며 effect가 재실행되어 구독이 등록된다.
  const symbolsKey = symbols.join(",");
  useEffect(() => {
    if (!symbolsKey) return;
    const targetSymbols = symbolsKey.split(",");
    wsClient.subscribePriceBatch(targetSymbols);

    let frameId: number | null = null;
    const priceQueue: Record<string, { price: number; change24h: number }> = {};
    const blinkQueue: string[] = [];

    /** Websocket 한 건 수신 시 가져오는 데이터 */
    const listener = (data: {
      symbol: string;
      currentPrice: number;
      change24h: number;
    }) => {
      // priceQueue에 데이터 저장
      priceQueue[data.symbol] = {
        price: data.currentPrice,
        change24h: data.change24h,
      };

      const prev = queryClient.getQueryData<MarketOverviewResponse>([
        querykeys.MarketOverview,
        params,
      ]);
      // 캐시된 데이터와 현재 데이터와 같은 값 찾기
      const prevItem = prev?.items.find((item) => item.symbol === data.symbol);

      if (prevItem && prevItem.change24h !== data.change24h) {
        blinkQueue.push(data.symbol);
      }
      // 이미 요청중이면 패스
      if (frameId) return;

      frameId = requestAnimationFrame(() => {
        frameId = null;
        blinkQueue.forEach((symbol) => onBlink?.(symbol));
        blinkQueue.length = 0;
        // 낙관적 업데이트
        queryClient.setQueryData(
          [querykeys.MarketOverview, params],
          (prev: MarketOverviewResponse): MarketOverviewResponse => {
            if (!prev?.items) return prev;

            /** 변경된 심볼만 업데이트 */
            const updatedMarketItems = prev.items.map(
              (item: MarketOverviewItem) => {
                const q = priceQueue[item.symbol];
                return q
                  ? {
                      ...item,
                      currentPrice: q.price,
                      change24h: q.change24h,
                    }
                  : item;
              }
            );
            return { ...prev, items: updatedMarketItems };
          }
        );

        // 큐 초기화
        for (const k in priceQueue) delete priceQueue[k];
      });
    };

    /** 리스너 등록 */
    targetSymbols.forEach((symbol) =>
      wsClient.addPriceListener(symbol, listener)
    );

    /** 클린업 */
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      targetSymbols.forEach((symbol) =>
        wsClient.removePriceListener(symbol, listener)
      );
    };
  }, [symbolsKey, params, queryClient, onBlink]);
};
