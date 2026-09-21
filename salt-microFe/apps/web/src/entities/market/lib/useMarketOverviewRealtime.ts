"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { wsClient } from "@/shared/api";

import { marketQueryKeys } from "../api/queryKeys";
import {
  MarketOverviewItem,
  MarketOverviewParams,
  MarketOverviewResponse,
} from "../model/types";

export const useMarketOverviewRealtime = (
  params: MarketOverviewParams,
  symbols: string[],
  onBlink?: (symbol: string) => void
): void => {
  // 기준 시각은 여기서 올리지 않는다 — 헤더가 `useRealtimeConnection` 으로 직접 읽는다.
  // 표가 그 state 를 들고 있으면 시각이 바뀔 때마다 100행이 다시 그려진다 (`FE-REQ-011` FR-13).
  const queryClient = useQueryClient();
  // 심볼 목록을 값 기준 키로 만든다.
  // 첫 마운트엔 데이터가 없어 symbols가 비어 있고, 데이터가 도착해 symbols가
  // 채워지면 symbolsKey가 바뀌며 effect가 재실행되어 구독이 등록된다.
  const symbolsKey = symbols.join(",");
  useEffect(() => {
    if (!symbolsKey) return;
    const targetSymbols = symbolsKey.split(",");

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
        marketQueryKeys.overview,
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
          [marketQueryKeys.overview, params],
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

    /**
     * 구독과 해제가 한 쌍이다. 해제는 리스너만 떼는 것이 아니라 **서버에도 알린다** —
     * 원래는 리스너만 떼서 화면을 떠나도 BFF 가 100종목을 계속 밀었다 (`FE-REQ-012` FR-24).
     */
    const unsubscribe = wsClient.subscribePrices(targetSymbols, listener);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      unsubscribe();
    };
  }, [symbolsKey, params, queryClient, onBlink]);
};
