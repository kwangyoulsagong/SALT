"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest } from "@/entities/household";

/**
 * 안 쓴 날 표시 · 지우기(`FE-REQ-057` FR-9 · `SRV-REQ-046` FR-16). 그날 지출이 있으면 서버가 거절한다(400 `STICKER_DAY_HAS_EXPENSE`).
 * 성공하면 그 달 화면을 다시 받는다 — 칸 상태 · 안 쓴 날 수는 서버 값.
 */
export const useMarkNoSpend = (ym: string) => {
  const queryClient = useQueryClient();
  return useMutation<{ date: string }, Error, { date: string; on: boolean }>({
    mutationFn: ({ date, on }) => householdRequest<{ date: string }>(on ? "PUT" : "DELETE", `/no-spend/${encodeURIComponent(date)}`, undefined, "household-no-spend"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.month(ym) }),
  });
};
