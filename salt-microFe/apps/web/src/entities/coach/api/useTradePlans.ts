"use client";

import type { TradePlanListResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

const TRADE_PLANS_STALE_TIME_MS = 60_000;

/** 종목별 거래 계획 (F009 `FE-REQ-039`). "내 계획" 카드가 읽는다 */
export const useTradePlans = (symbol: string) => {
  const token = readAccessToken();

  const query = useQuery<TradePlanListResult, Error>({
    queryKey: coachQueryKeys.plans(symbol),
    queryFn: ({ signal }) => coachApi.plans(symbol, signal),
    enabled: Boolean(token) && symbol !== "",
    staleTime: TRADE_PLANS_STALE_TIME_MS,
    retry: (count, error) =>
      count < 1 && !(error instanceof CoachApiError && error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR),
  });

  return { ...query, isSignedOut: !token };
};
