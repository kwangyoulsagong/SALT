"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";


import type { SearchRelatedTarget } from "../model/types";
import { marketApi } from "./marketApi";
import { marketQueryKeys } from "./queryKeys";
import { useKrMarketStatus } from "./useKrStockQueries";

/** 첫 화면 "지금 뜨는 업종" 줄 수 — 거래대금 상위와 같은 5(`FE-REQ-066` FR-8 · 실측) */
export const RISING_SECTOR_COUNT = 5;
const SEARCH_EXTRAS_STALE_MS = 30_000;
/** 곁 칸은 고른 행이 바뀔 때마다 묻는다 — 같은 행은 1분 다시 묻지 않는다(업종 · 기사 원천이 분 단위 이하로 안 바뀐다) */
const RELATED_STALE_MS = 60_000;

/**
 * 결과 묶음 — 업종 · 지수 · 뉴스(`FE-REQ-066` FR-8). 종목 결과(`useAssetSearch`)와 **나란히** 부른다 — 한쪽이 늦어도 다른 쪽은 먼저 그린다.
 * `q` 는 이미 디바운스 · 공백 제거된 값. 비면 부르지 않는다(빈 검색어의 첫 화면은 순위다)
 */
export const useSearchGroups = (q: string) => {
  return useQuery({
    queryKey: [...marketQueryKeys.searchGroups, q],
    queryFn: ({ signal }) => marketApi.searchGroups(q, signal),
    enabled: q !== "",
    placeholderData: keepPreviousData,
    staleTime: SEARCH_EXTRAS_STALE_MS,
  });
};

/**
 * 첫 화면 "지금 뜨는 업종" — 국내 원천이라 **장 상태가 `ok`(소유자 · 키 있음)일 때만** 부른다(거래대금 상위 국내 묶음과 같은 판정 ·
 * 같은 장 상태 캐시). 비소유자는 요청 0
 */
export const useRisingSectors = (enabled: boolean) => {
  const krStatus = useKrMarketStatus();
  return useQuery({
    queryKey: [...marketQueryKeys.risingSectors, RISING_SECTOR_COUNT],
    queryFn: ({ signal }) => marketApi.risingSectors(RISING_SECTOR_COUNT, signal),
    enabled: enabled && krStatus.data?.status === "ok",
    staleTime: SEARCH_EXTRAS_STALE_MS,
  });
};

const targetKey = (target: SearchRelatedTarget | null) =>
  target === null ? "none" : "sector" in target ? `sector:${target.sector}` : `${target.assetType}:${target.symbol}`;

/** 곁 칸 — 고른 줄의 관련 종목. 대상이 없으면(뉴스 · 지수 줄 · 아무것도 안 고름) 부르지 않는다 */
export const useSearchRelated = (target: SearchRelatedTarget | null) => {
  return useQuery({
    queryKey: [...marketQueryKeys.searchRelated, targetKey(target)],
    queryFn: ({ signal }) => marketApi.searchRelated(target!, signal),
    enabled: target !== null,
    staleTime: RELATED_STALE_MS,
  });
};
