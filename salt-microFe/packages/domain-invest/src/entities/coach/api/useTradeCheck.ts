"use client";

import type { TradeCheckResult, TradeCheckSide } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasSession, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 기저율 · 문턱은 하루 1회 — 다시 부르는 이유는 지금 시세가 문턱을 넘었나 뿐이다. 1분이면 충분하다 */
const TRADE_CHECK_STALE_TIME_MS = 60_000;

/**
 * 사기 전 · 팔기 전 점검(F017 v2 단계 2 · `FE-REQ-064` FR-3). 종목 · 방향마다 한 번.
 * 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다
 */
export const useTradeCheck = (symbol: string | undefined, side: TradeCheckSide) => {
  const signedIn = useHasSession();
  const target = symbol ?? "";
  const query = useQuery<TradeCheckResult, Error>({
    queryKey: coachQueryKeys.tradeCheck(target, side),
    queryFn: ({ signal }) => coachApi.tradeCheck(target, side, signal),
    enabled: signedIn === true && target !== "",
    staleTime: TRADE_CHECK_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
  return { ...query, isSignedOut: signedIn === false };
};
