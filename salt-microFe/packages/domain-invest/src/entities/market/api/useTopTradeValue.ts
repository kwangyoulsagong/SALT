"use client";

import { useMemo } from "react";

import { krQuoteToOverviewItem } from "../lib/krOverviewItem";
import { MarketOrder, type MarketOverviewItem, MarketSort } from "../model/types";
import { useKrOverview } from "./useKrStockQueries";
import { useMarketOverview } from "./useMarketQueries";

/** 검색 모달 첫 화면 순위 길이(`FE-REQ-066` FR-3 — 실측 5) */
export const TOP_TRADE_VALUE_COUNT = 5;

export interface TopTradeValueGroup {
  items: MarketOverviewItem[];
  /** 순위의 기준 시각 — 행 시세 시각 중 가장 늦은 것(ISO). 없으면 `null` */
  asOf: string | null;
}

const latest = (items: MarketOverviewItem[]): string | null =>
  items.reduce<string | null>((max, item) => (item.priceUpdatedAt && (!max || item.priceUpdatedAt > max) ? item.priceUpdatedAt : max), null);

const toGroup = (items: MarketOverviewItem[] | undefined): TopTradeValueGroup | null =>
  items && items.length > 0 ? { items: items.slice(0, TOP_TRADE_VALUE_COUNT), asOf: latest(items) } : null;

/**
 * 거래대금 상위(`FE-REQ-066` FR-3 · D3) — **조회 순위 원천이 없다.** "인기"라 부르지 않고 거래대금 순위라고 쓴다.
 * 원천은 시세 표와 같은 조회(코인 개요 · 국내 표, `sort=trade_value` 내림차순) — 새 경로가 없다. 같은 키라 표와 캐시를 나눈다.
 *
 * 국내는 소유자만 받는다(F011) — 비소유자 · 로그아웃 · 실패 · 키 없음(`disabled`)은 `null`(묶음을 그리지 않는다). 코인도 실패면 `null`
 */
export const useTopTradeValue = (enabled: boolean) => {
  const crypto = useMarketOverview(
    { page: 1, limit: TOP_TRADE_VALUE_COUNT, sort: MarketSort.TradeValue, order: MarketOrder.Descending },
    enabled,
  );
  const kr = useKrOverview(
    { limit: TOP_TRADE_VALUE_COUNT, offset: 0, sort: MarketSort.TradeValue, order: MarketOrder.Descending },
    enabled,
  );

  const krGroup = useMemo(
    () => (kr.data?.status === "ok" ? toGroup(kr.data.items.map(krQuoteToOverviewItem)) : null),
    [kr.data],
  );
  const cryptoGroup = useMemo(() => toGroup(crypto.data?.items), [crypto.data]);

  return {
    crypto: cryptoGroup,
    kr: krGroup,
    /** 둘 다 첫 응답 전 — 자리만 잡는다 */
    isPending: enabled && crypto.isPending && !crypto.isError,
  };
};
