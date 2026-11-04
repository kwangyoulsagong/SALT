"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdApi, householdQueryKeys, householdRequest, type ExpenseRequest, type ParseResult, type RecordResult } from "@/entities/household";

/** 쓰기는 재시도하지 않는다(중복 지출). 성공하면 가계부 조회(월 · 제안)를 다시 받는다 */
export const useRecordExpense = () => {
  const queryClient = useQueryClient();
  return useMutation<RecordResult, Error, ExpenseRequest>({
    mutationFn: (body) => householdRequest<RecordResult>("POST", "/expenses", body, "household-record"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all }),
  });
};

/** 붙여넣기 확인 목록 — 한 번에(한 트랜잭션) */
export const useRecordExpenses = () => {
  const queryClient = useQueryClient();
  return useMutation<RecordResult, Error, ExpenseRequest[]>({
    mutationFn: (expenses) => householdRequest<RecordResult>("POST", "/expenses/batch", { expenses }, "household-record-batch"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all }),
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => householdRequest<{ id: string }>("DELETE", `/expenses/${encodeURIComponent(id)}`, undefined, "household-delete"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all }),
  });
};

/** 파싱(저장 안 함) — 결과를 캐시에 두지 않는다(원문에서 나온 후보가 화면 밖에 남지 않게) */
export const useParseInput = () =>
  useMutation<ParseResult, Error, { mode: "line" | "messages"; text: string }>({
    mutationFn: ({ mode, text }) => householdApi.parse(mode, text),
    gcTime: 0,
  });
