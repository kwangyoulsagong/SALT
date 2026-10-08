"use client";

import { useMemo } from "react";

import { krQuoteToOverviewItem } from "../lib/krOverviewItem";
import {
  MarketAssetClass,
  type MarketOverviewParams,
  type MarketOverviewResponse,
} from "../model/types";
import type { KrOverviewQuery } from "./endpoints";
import { useKrOverview } from "./useKrStockQueries";
import { useMarketOverview } from "./useMarketQueries";

export interface BoardOverviewResult {
  data: MarketOverviewResponse | undefined;
  isPending: boolean;
  isError: boolean;
}

/** 코인 목록 조건 → 국내 주식 조회 조건. 필터 값은 그대로 넘긴다(같은 필터 줄) */
export const toKrOverviewQuery = (params: MarketOverviewParams): KrOverviewQuery => ({
  limit: params.limit,
  offset: (params.page - 1) * params.limit,
  sort: params.sort,
  order: params.order,
  period: params.period,
});

/**
 * 시세 보드의 목록 — 자산군에 따라 소스만 바꾼다(F011 `FE-REQ-041` "똑같은 화면, 데이터만 다르다").
 *
 * 국내 주식은 `krQuoteToOverviewItem` 으로 코인 행 모양에 맞춘다. BFF 가 `disabled`(키 없음) · `unavailable`(서버 5xx)을 200 으로
 * 주는데, 표에는 둘 다 "불러오지 못함"이다 — 0원 표를 그리지 않는다. 두 훅을 늘 부르고 쓰지 않는 쪽은 조회를 끈다.
 */
export const useBoardOverview = (
  assetClass: MarketAssetClass,
  params: MarketOverviewParams,
): BoardOverviewResult => {
  const isKr = assetClass === MarketAssetClass.KrStock;
  const crypto = useMarketOverview(params, !isKr);
  const kr = useKrOverview(toKrOverviewQuery(params), isKr);

  const krData = useMemo<MarketOverviewResponse | undefined>(
    () =>
      kr.data?.status === "ok"
        ? { items: kr.data.items.map(krQuoteToOverviewItem), krSession: kr.data.session }
        : undefined,
    [kr.data],
  );

  if (!isKr) return { data: crypto.data, isPending: crypto.isPending, isError: crypto.isError };
  return {
    data: krData,
    isPending: kr.isPending,
    isError: kr.isError || (kr.data !== undefined && kr.data.status !== "ok"),
  };
};
