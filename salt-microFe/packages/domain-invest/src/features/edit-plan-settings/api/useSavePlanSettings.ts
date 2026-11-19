"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { planQueryKeys, type PlanSettingsVM } from "@/entities/plan";
import type { ApiError } from "@repo/web-shared/api";

import { savePlanSettings } from "./settingsApi";

/**
 * 저장 — 낙관적 갱신 0(금액 설정이다). 성공 뒤 설정은 응답 값으로 두고, 주간 계획 · 월 합계는 서버에서 다시 받는다 —
 * 첫 저장이면 이번 주 계획이 바로 생기고(B12), 수정이면 서버가 이번 주를 그대로 둔다(다음 주부터 — 화면이 판정하지 않는다)
 */
export const useSavePlanSettings = () => {
  const queryClient = useQueryClient();
  return useMutation<PlanSettingsVM, ApiError, { monthlyBaseKrw: number }>({
    mutationFn: savePlanSettings,
    retry: 0,
    onSuccess: (saved) => {
      queryClient.setQueryData(planQueryKeys.settings, saved);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: planQueryKeys.weekly }),
        queryClient.invalidateQueries({ queryKey: planQueryKeys.monthlySummary }),
      ]);
    },
  });
};
