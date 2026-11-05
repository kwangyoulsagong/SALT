"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type OccasionEnvelope } from "@/entities/household";

const peopleKey = [...householdQueryKeys.all, "people"] as const;

/** 해 봉투 정하기 · 지우기(가계부 S1h). 재시도하지 않는다 — 사람 장부 화면을 다시 받는다 */
export const useSetOccasionEnvelope = () => {
  const queryClient = useQueryClient();
  return useMutation<OccasionEnvelope | { deleted: boolean }, Error, { year: number; amount: number | null }>({
    mutationFn: ({ year, amount }) =>
      amount === null
        ? householdRequest<{ deleted: boolean }>("DELETE", `/people/envelope/${year}`, undefined, "household-envelope-delete")
        : householdRequest<OccasionEnvelope>("PUT", `/people/envelope/${year}`, { amount }, "household-envelope-set"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKey }),
  });
};
