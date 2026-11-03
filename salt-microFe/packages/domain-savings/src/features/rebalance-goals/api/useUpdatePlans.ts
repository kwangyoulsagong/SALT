"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { goalQueryKeys, type PlanChangesRequest, type SavingsGoal } from "@/entities/goal";

const SAVINGS = `${INVESTMENTS_BASE_URL}/api/app/savings`;

/** 저울 확정(`SRV-REQ-045` FR-7) — 바꾼 목표의 월 계획만 저장. 응답(목록 전체)으로 목록을 채우고 상세만 무효화. 재시도 없음 */
export const updatePlans = async (body: PlanChangesRequest): Promise<SavingsGoal[]> => {
  const response = await apiFetch(`${SAVINGS}/goals/plans`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readApiError(response, "savings-plans");
  return (await response.json()) as SavingsGoal[];
};

export const useUpdatePlans = () => {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoal[], Error, PlanChangesRequest>({
    mutationFn: updatePlans,
    onSuccess: (goals) => {
      queryClient.setQueryData(goalQueryKeys.list(), goals);
      return queryClient.invalidateQueries({ queryKey: [...goalQueryKeys.all, "detail"] });
    },
  });
};
