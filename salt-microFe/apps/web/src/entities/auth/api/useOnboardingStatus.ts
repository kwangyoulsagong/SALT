"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useHasAccessToken } from "@/shared/api";

import type { OnboardingStatus } from "../model/types";
import { onboardingApi } from "./onboardingApi";
import { authQueryKeys } from "./queryKeys";

/**
 * 창에 포커스가 돌아올 때마다 다시 묻지 않게 한다. 이 값은 스텝을 끝낼 때만 바뀌고,
 * 그때는 무효화로 갱신한다 (`performance-frontend.md` §6).
 */
const ONBOARDING_STALE_TIME_MS = 30_000;

/**
 * 온보딩 진행 상태.
 *
 * 토큰이 없으면 **부르지 않는다.** 초대 코드 화면도 이 훅이 걸린 트리 안에 있고,
 * 토큰 없이 부르면 401 이 에러 경계까지 올라가 "불러오지 못했습니다"가 뜬다 —
 * 아직 계정이 없는 것은 오류가 아니다.
 *
 * 토큰은 `useHasAccessToken` 으로 읽는다 — 렌더 중에 `localStorage` 를 직접 읽으면 서버(토큰 없음)와
 * 클라이언트(토큰 있음) 첫 렌더가 달라 하이드레이션이 깨졌다(2026-09-30 QA). 서버 · 하이드레이션 중에는 `null` 이다.
 */
export const useOnboardingStatus = (): UseQueryResult<OnboardingStatus> => {
  const hasToken = useHasAccessToken() === true;

  return useQuery({
    queryKey: authQueryKeys.onboardingStatus,
    queryFn: onboardingApi.status,
    enabled: hasToken,
    staleTime: ONBOARDING_STALE_TIME_MS,
  });
};
