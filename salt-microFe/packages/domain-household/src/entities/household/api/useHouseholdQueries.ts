"use client";

import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@repo/web-shared/api";

import type { HouseholdMonth, HouseholdStory } from "../model/types";
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

/** 분류 표(가계부 S1f) — 칩 · 내 분류 이름. [enabled] false 면 부르지 않는다(월 화면처럼 이미 받은 표가 있을 때) */
export const useHouseholdCategories = (enabled = true) => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.categories(),
    queryFn: ({ signal }) => householdApi.categories(signal),
    enabled: enabled && signedIn === true,
    staleTime: SUGGEST_STALE_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
};

export const useRecurringTemplates = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.templates(),
    queryFn: ({ signal }) => householdApi.templates(signal),
    enabled: signedIn === true,
    staleTime: MONTH_STALE_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
};

/** 챌린지 목록(가계부 S1d) */
export const useChallenges = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.challenges(),
    queryFn: ({ signal }) => householdApi.challenges(signal),
    enabled: signedIn === true,
    staleTime: MONTH_STALE_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
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

export const useWorkHours = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.workHours(),
    queryFn: ({ signal }) => householdApi.workHours(signal),
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

/** 이야기 카드(가계부 S1g). @param initial 서버 컴포넌트가 쿠키로 미리 받은 값 — 첫 HTML 부터 카드가 있다 */
export const useHouseholdStory = (period: string, initial?: HouseholdStory | null) => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.story(period),
    queryFn: ({ signal }) => householdApi.story(period, signal),
    enabled: signedIn === true,
    staleTime: MONTH_STALE_MS,
    ...(initial ? { initialData: initial } : {}),
  });
  return { ...query, isSignedOut: signedIn === false && !initial };
};

/** 리볼빙 명세서(가계부 S1h) — 추정은 서버 */
export const useRevolving = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.revolving(),
    queryFn: ({ signal }) => householdApi.revolving(signal),
    enabled: signedIn === true,
    staleTime: MONTH_STALE_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
};

/** 사람 장부(가계부 S1h) — 해를 바꾸는 동안 앞 화면을 둔다(빈 칸 깜빡임 0) */
export const usePeople = (year: number | null, person: string | null) => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: householdQueryKeys.people(year, person),
    queryFn: ({ signal }) => householdApi.people(year, person, signal),
    enabled: signedIn === true,
    staleTime: MONTH_STALE_MS,
    placeholderData: (previous) => previous,
  });
  return { ...query, isSignedOut: signedIn === false };
};
