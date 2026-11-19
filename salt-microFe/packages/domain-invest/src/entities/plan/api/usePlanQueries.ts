"use client";

import { useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { planApi } from "./planApi";
import { planQueryKeys } from "./queryKeys";

/** 주에 한 번 바뀌는 값이다 — 체크 · 저장 뒤에는 무효화로 다시 받는다 */
const PLAN_STALE_TIME_MS = 60_000;

/** 이번 주 계획 — 로그인 안 한 것은 실패가 아니라 상태. 4xx 는 다시 부르지 않는다 */
export const useWeeklyPlan = () => {
  const signedIn = useHasSession();
  const query = useQuery({
    queryKey: planQueryKeys.weekly,
    queryFn: ({ signal }) => planApi.weekly(signal),
    enabled: signedIn === true,
    staleTime: PLAN_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
  return { ...query, isSignedOut: signedIn === false };
};

export const usePlanSettings = (enabled = true) => {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: planQueryKeys.settings,
    queryFn: ({ signal }) => planApi.settings(signal),
    enabled: enabled && signedIn === true,
    staleTime: PLAN_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
};

/** 이번 달 합계 — 실패해도 주간 계획은 그대로(블록만 실패, `FE-REQ-022` FR-84) */
export const useMonthlyPlanSummary = (enabled = true) => {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: planQueryKeys.monthlySummary,
    queryFn: ({ signal }) => planApi.monthlySummary(signal),
    enabled: enabled && signedIn === true,
    staleTime: PLAN_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
};
