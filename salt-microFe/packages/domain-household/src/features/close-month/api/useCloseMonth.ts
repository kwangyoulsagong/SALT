"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type MonthClose } from "@/entities/household";

export interface CloseMonthRequest {
  satisfied: string;
  tryNext: string;
  knownNext: string;
}

/** 월 마감 리뷰 저장(`FE-REQ-057` FR-7 · `SRV-REQ-046` FR-9). 다시 내면 답만 고친다 — 서버가 정한다. 성공하면 그 달 화면을 다시 받는다 */
export const useCloseMonth = (ym: string) => {
  const queryClient = useQueryClient();
  return useMutation<MonthClose, Error, CloseMonthRequest>({
    mutationFn: (body) => householdRequest<MonthClose>("POST", `/month/${encodeURIComponent(ym)}/close`, body, "household-close-month"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.month(ym) }),
  });
};
