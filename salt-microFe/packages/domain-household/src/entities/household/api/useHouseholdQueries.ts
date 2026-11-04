"use client";

import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@repo/web-shared/api";

import type { HouseholdMonth } from "../model/types";
import { householdApi } from "./householdApi";
import { householdQueryKeys } from "./queryKeys";

/** 가계부 조회 훅 — 토큰이 있을 때만 부른다(로그아웃은 실패가 아니라 상태) */
const MONTH_STALE_MS = 30_000;
const SUGGEST_STALE_MS = 5 * 60_000;

/** @param initial 서버 컴포넌트가 쿠키로 미리 받은 값 — 있으면 첫 렌더(서버 HTML 포함)부터 숫자가 있다 */
export const useHouseholdMonth = (ym: string, initial?: HouseholdMonth | null) => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.month(ym),
    queryFn: ({ signal }) => householdApi.month(ym, signal),
    enabled: signedIn === true,
    staleTime: MONTH_STALE_MS,
    ...(initial ? { initialData: initial } : {}),
  });
  return { ...query, isSignedOut: signedIn === false && !initial };
};

export const useHouseholdSuggestions = () => {
  const signedIn = useHasAccessToken();
  return useQuery({
    queryKey: householdQueryKeys.suggestions(),
    queryFn: ({ signal }) => householdApi.suggestions(signal),
    enabled: signedIn === true,
    staleTime: SUGGEST_STALE_MS,
  });
};

export const useHouseholdBudget = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.budget(),
    queryFn: ({ signal }) => householdApi.budget(signal),
    enabled: signedIn === true,
  });
  return { ...query, isSignedOut: signedIn === false };
};

/** 목표 시계 다시 묻기 — 저장 응답이 `pending` 일 때만(amount 가 null 이면 부르지 않는다) */
export const useGoalClockRetry = (amount: number | null) =>
  useQuery({
    queryKey: householdQueryKeys.goalClock(amount ?? 0),
    queryFn: ({ signal }) => householdApi.goalClock(amount ?? 0, signal),
    enabled: amount !== null,
    staleTime: Infinity,
    retry: 1,
  });
