"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, readApiError, type ApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import {
  authQueryKeys,
  ONBOARDING_ENDPOINTS,
  type Onboarding,
  type OnboardingDomain,
} from "@/entities/auth";
import { homeQueryKeys } from "@/entities/home";

const send = async (path: string, init: RequestInit, label: string): Promise<Onboarding> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${path}`, init);
  if (!response.ok) throw await readApiError(response, label);
  return (await response.json()) as Onboarding;
};

/**
 * 온보딩 두 쓰기(`FE-REQ-055` FR-4 · `BFF-REQ-046` FR-6). 성공 응답은 서버가 정한 다음 상태라 그대로 캐시에 넣는다 —
 * 화면이 다음 단계를 계산하지 않는다. 고른 도메인이 홈 기본 숨김을 바꾸므로 홈 카드도 무효화한다. 재시도 0회(쓰기).
 */
export const useChooseDomains = () => {
  const queryClient = useQueryClient();
  return useMutation<Onboarding, ApiError, OnboardingDomain[]>({
    mutationFn: (domains) =>
      send(
        ONBOARDING_ENDPOINTS.domains(),
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domains }) },
        "choose domains",
      ),
    retry: 0,
    onSuccess: (result) => {
      queryClient.setQueryData(authQueryKeys.onboarding, result);
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.all });
    },
  });
};

/** 끝내기 — 첫 입력 화면으로 넘어가기 직전(또는 나중에 하기). 끝난 뒤 다시 불러도 서버가 처음 시각을 지킨다 */
export const useFinishOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation<Onboarding, ApiError, void>({
    mutationFn: () => send(ONBOARDING_ENDPOINTS.finish(), { method: "POST" }, "finish onboarding"),
    retry: 0,
    onSuccess: (result) => {
      queryClient.setQueryData(authQueryKeys.onboarding, result);
    },
  });
};
