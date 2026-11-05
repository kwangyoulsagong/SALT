"use client";

import type { RiskBudgetResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasSession, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 게이지는 거래 · 예산 저장 때 무효화된다 — 그 사이에 다시 부를 이유가 적다 */
const RISK_BUDGET_STALE_TIME_MS = 60_000;

/**
 * 리스크 예산 게이지 · 측정 · 설정 (F009 `FE-REQ-039`). 4xx 는 다시 부르지 않는다.
 * 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다.
 */
export const useRiskBudget = () => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다(`/search` 수화 불일치, 2026-11-02)
  const signedIn = useHasSession();

  const query = useQuery<RiskBudgetResult, Error>({
    queryKey: coachQueryKeys.riskBudget(),
    queryFn: ({ signal }) => coachApi.riskBudget(signal),
    enabled: signedIn === true,
    staleTime: RISK_BUDGET_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  return { ...query, isSignedOut: signedIn === false };
};
