"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type BudgetRequest, type HouseholdBudget } from "@/entities/expense";

/** 예산 정하기 — 통째로 바꾼다. 성공하면 예산 · 월 화면을 다시 받는다 */
export const useSetBudget = () => {
  const queryClient = useQueryClient();
  return useMutation<HouseholdBudget, Error, BudgetRequest>({
    mutationFn: (body) => householdRequest<HouseholdBudget>("PUT", "/budget", body, "household-budget-set"),
    onSuccess: (budget) => {
      queryClient.setQueryData(householdQueryKeys.budget(), budget);
      return queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
  });
};
