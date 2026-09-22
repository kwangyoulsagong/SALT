"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { type PriceUpdate, wsClient } from "@/shared/api";

import { marketQueryKeys } from "../api/queryKeys";
import type { MarketSummaryItem, MarketSummaryResponse } from "../model/types";

/**
 * 시장 요약 띠의 가격 · 변동률 · 등락 금액을 WS 로 갱신한다(`FE-REQ-037` FR-5).
 *
 * **값은 거래소 · 서버 것을 옮기기만 한다** — 등락 금액은 BFF 가 거래소 값을 실어 보낸다.
 * 옛 BFF 라 금액이 없으면 이전 값을 둔다(계산해 채우지 않는다). 프레임당 한 번만 캐시를 고친다.
 */
export const useMarketSummaryRealtime = (symbols: string[]): void => {
  const queryClient = useQueryClient();
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbolsKey) return undefined;

    let frameId: number | null = null;
    const queue = new Map<string, PriceUpdate>();

    const patch = (item: MarketSummaryItem): MarketSummaryItem => {
      const update = queue.get(item.symbol.toUpperCase());
      if (!update) return item;
      return {
        ...item,
        currentPrice: update.currentPrice,
        change24h: update.change24h,
        change24hAmount: update.change24hAmount ?? item.change24hAmount,
      };
    };

    const unsubscribe = wsClient.subscribePrices(symbolsKey.split(","), (data) => {
      queue.set(data.symbol.toUpperCase(), data);
      if (frameId !== null) return;
      frameId = requestAnimationFrame(() => {
        frameId = null;
        queryClient.setQueryData<MarketSummaryResponse>(
          marketQueryKeys.summary,
          (prev) =>
            prev && {
              ...prev,
              featured: prev.featured && patch(prev.featured),
              items: prev.items.map(patch),
            },
        );
        queue.clear();
      });
    });

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      unsubscribe();
    };
  }, [symbolsKey, queryClient]);
};
