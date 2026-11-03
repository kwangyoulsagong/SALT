"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { goalQueryKeys, savingsRequest, type PlanChangesRequest, type SavingsGoal } from "@/entities/goal";

/** 저울 확정(`SRV-REQ-045` FR-7) — 바꾼 목표의 월 계획만 저장. 응답(목록 전체)으로 목록을 채우고 상세만 무효화. 재시도 없음 */
export const useUpdatePlans = () => {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoal[], Error, PlanChangesRequest>({
    mutationFn: (body) => savingsRequest("PUT", "/goals/plans", body, "savings-plans"),
    onSuccess: (goals) => {
      queryClient.setQueryData(goalQueryKeys.list(), goals);
      return queryClient.invalidateQueries({ queryKey: [...goalQueryKeys.all, "detail"] });
    },
  });
};
