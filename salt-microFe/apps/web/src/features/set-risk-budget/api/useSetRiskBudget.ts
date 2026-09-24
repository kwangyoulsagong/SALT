"use client";

import type { RiskBudgetResult, RiskBudgetUpdate } from "@repo/core/coach";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";

import { SetRiskBudgetApiError, setRiskBudgetApi } from "./setRiskBudgetApi";

/**
 * 예산 저장. 응답이 곧 새 게이지라 캐시에 그대로 넣고, 사이즈 계산은 버린다(예산 대비 % 가 바뀐다).
 * 낙관적 갱신 없음 — 게이지 금액은 서버가 원으로 환산해 준다. 재시도 0회.
 */
export const useSetRiskBudget = () => {
  const queryClient = useQueryClient();
  return useMutation<RiskBudgetResult, SetRiskBudgetApiError, RiskBudgetUpdate>({
    mutationFn: setRiskBudgetApi.save,
    retry: 0,
    onSuccess: (result) => {
      queryClient.setQueryData(coachQueryKeys.riskBudget(), result);
      return queryClient.invalidateQueries({ queryKey: coachQueryKeys.sizeCheckAll() });
    },
  });
};
