"use client";

import type { TradePlanListResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasSession, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

const TRADE_PLANS_STALE_TIME_MS = 60_000;

/** 종목별 거래 계획 (F009 `FE-REQ-039`). "내 계획" 카드가 읽는다 */
export const useTradePlans = (symbol: string) => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다(`/search` 수화 불일치, 2026-11-02)
  const signedIn = useHasSession();

  const query = useQuery<TradePlanListResult, Error>({
    queryKey: coachQueryKeys.plans(symbol),
    queryFn: ({ signal }) => coachApi.plans(symbol, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: TRADE_PLANS_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  return { ...query, isSignedOut: signedIn === false };
};
