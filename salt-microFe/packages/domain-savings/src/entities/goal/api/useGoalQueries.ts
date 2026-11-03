"use client";

import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@repo/web-shared/api";

import type { CalculationRequest, SavingsCalculation } from "../model/types";
import { goalApi } from "./goalApi";
import { goalQueryKeys } from "./queryKeys";

/**
 * 저축 조회 훅 — 토큰이 있을 때만 부른다(로그아웃은 실패가 아니라 상태). 토큰이 쿠키로 옮기면(`FE-REQ-013`) 첫 숫자가
 * 서버 렌더로 내려간다(`FE-REQ-056` FR-13) — 지금은 브라우저 저장소 토큰이라 서버가 볼 수 없다.
 */
const GOALS_STALE_MS = 30_000;
const TEMPLATES_STALE_MS = 10 * 60_000;

export const useSavingsGoals = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: goalQueryKeys.list(),
    queryFn: ({ signal }) => goalApi.list(signal),
    enabled: signedIn === true,
    staleTime: GOALS_STALE_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
};

export const useSavingsGoal = (id: string) => {
  const signedIn = useHasAccessToken();
  const query = useQuery({
    queryKey: goalQueryKeys.detail(id),
    queryFn: ({ signal }) => goalApi.detail(id, signal),
    enabled: signedIn === true,
    staleTime: GOALS_STALE_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
};

export const useSavingsTemplates = () => {
  const signedIn = useHasAccessToken();
  return useQuery({
    queryKey: goalQueryKeys.templates,
    queryFn: ({ signal }) => goalApi.templates(signal),
    enabled: signedIn === true,
    staleTime: TEMPLATES_STALE_MS,
  });
};

/** 계산 — 입력이 비면(null) 부르지 않는다. 입력이 바뀌는 동안 이전 결과를 보여 준다(디바운스는 부르는 쪽) */
export const useSavingsCalculation = (request: CalculationRequest | null) =>
  useQuery<SavingsCalculation>({
    queryKey: [...goalQueryKeys.all, "calculate", request] as const,
    queryFn: ({ signal }) => (request ? goalApi.calculate(request, signal) : Promise.reject(new Error("no request"))),
    enabled: request !== null,
    placeholderData: (previous) => previous,
    staleTime: Infinity,
    retry: false,
  });
