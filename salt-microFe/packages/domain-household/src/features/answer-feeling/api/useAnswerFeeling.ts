"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type ExpenseFeeling } from "@/entities/household";

/**
 * 다음 날 만족 답하기(`FE-REQ-057` FR-8 · `SRV-REQ-046` FR-13). felt 가 null 이면 넘김 — 둘 다 한 번만(두 번째는 서버 409).
 * 성공하면 그 달 화면을 다시 받는다(묻기 목록 · 거울이 같이 바뀐다). 비금액 상태지만 낙관적 갱신은 하지 않는다 — 409 를 그대로 보인다.
 */
export const useAnswerFeeling = (ym: string) => {
  const queryClient = useQueryClient();
  return useMutation<ExpenseFeeling, Error, { expenseId: string; felt: number | null }>({
    mutationFn: ({ expenseId, felt }) =>
      householdRequest<ExpenseFeeling>("POST", `/expenses/${encodeURIComponent(expenseId)}/feeling/next`, felt === null ? {} : { felt }, "household-feeling-next"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.month(ym) }),
  });
};
