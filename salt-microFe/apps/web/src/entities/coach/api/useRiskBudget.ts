"use client";

import type { RiskBudgetResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 게이지는 거래 · 예산 저장 때 무효화된다 — 그 사이에 다시 부를 이유가 적다 */
const RISK_BUDGET_STALE_TIME_MS = 60_000;

/**
 * 리스크 예산 게이지 3 · 설정 (F009 `FE-REQ-039`). 4xx 는 다시 부르지 않는다.
 * 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다.
 */
export const useRiskBudget = () => {
  const token = readAccessToken();

  const query = useQuery<RiskBudgetResult, Error>({
    queryKey: coachQueryKeys.riskBudget(),
    queryFn: ({ signal }) => coachApi.riskBudget(signal),
    enabled: Boolean(token),
    staleTime: RISK_BUDGET_STALE_TIME_MS,
    retry: (count, error) =>
      count < 1 && !(error instanceof CoachApiError && error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR),
  });

  return { ...query, isSignedOut: !token };
};
