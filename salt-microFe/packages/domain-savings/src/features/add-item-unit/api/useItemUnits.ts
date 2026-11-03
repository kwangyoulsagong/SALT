"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { goalQueryKeys, savingsRequest, type SavingsGoalDetail } from "@/entities/goal";

export interface AddItemUnitRequest {
  name: string;
  unitPrice: number;
}

/** 응답(갱신된 상세 — 환산 개수는 서버)으로 상세를 채우고 목록의 한 줄 환산을 위해 목록만 무효화 */
const useDetailMutation = <V,>(goalId: string, run: (v: V) => Promise<SavingsGoalDetail>) => {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoalDetail, Error, V>({
    mutationFn: run,
    onSuccess: (detail) => {
      queryClient.setQueryData(goalQueryKeys.detail(goalId), detail);
      return queryClient.invalidateQueries({ queryKey: goalQueryKeys.list() });
    },
  });
};

const unitsPath = (goalId: string) => `/goals/${encodeURIComponent(goalId)}/units`;

export const useAddItemUnit = (goalId: string) =>
  useDetailMutation<AddItemUnitRequest>(goalId, (body) => savingsRequest("POST", unitsPath(goalId), body, "savings-unit-add"));

export const useDeleteItemUnit = (goalId: string) =>
  useDetailMutation<string>(goalId, (unitId) => savingsRequest("DELETE", `${unitsPath(goalId)}/${encodeURIComponent(unitId)}`, undefined, "savings-unit-delete"));
