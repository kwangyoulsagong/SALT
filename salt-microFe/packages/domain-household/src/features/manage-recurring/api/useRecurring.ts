"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type ConfirmResult, type RecurringTemplate, type TemplateRequest } from "@/entities/household";

/**
 * 반복 템플릿 · 예정 행 쓰기(가계부 S1b `FE-REQ-057` FR-4). 재시도하지 않는다(확인은 지출을 만든다 — 중복 지출).
 * 성공하면 가계부 조회 전부(월 · 템플릿 · 제안)를 다시 받는다 — 착지 예정 몫 · 봉투가 같이 바뀐다.
 */
const useInvalidateAll = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
};

export const useCreateTemplate = () => {
  const invalidate = useInvalidateAll();
  return useMutation<RecurringTemplate, Error, TemplateRequest>({
    mutationFn: (body) => householdRequest<RecurringTemplate>("POST", "/templates", body, "household-template-create"),
    onSuccess: invalidate,
  });
};

export const useEditTemplate = () => {
  const invalidate = useInvalidateAll();
  return useMutation<RecurringTemplate, Error, { id: string; body: TemplateRequest }>({
    mutationFn: ({ id, body }) => householdRequest<RecurringTemplate>("PUT", `/templates/${encodeURIComponent(id)}`, body, "household-template-edit"),
    onSuccess: invalidate,
  });
};

export const useEndTemplate = () => {
  const invalidate = useInvalidateAll();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => householdRequest<{ id: string }>("DELETE", `/templates/${encodeURIComponent(id)}`, undefined, "household-template-end"),
    onSuccess: invalidate,
  });
};

/** "나갔어요" — 금액을 고쳤으면 그 값, 아니면 본문 없이(예정 금액) */
export const useConfirmOccurrence = () => {
  const invalidate = useInvalidateAll();
  return useMutation<ConfirmResult, Error, { id: string; amount: number | null }>({
    mutationFn: ({ id, amount }) =>
      householdRequest<ConfirmResult>("POST", `/occurrences/${encodeURIComponent(id)}/confirm`, amount === null ? {} : { amount }, "household-occurrence-confirm"),
    onSuccess: invalidate,
  });
};

export const useSkipOccurrence = () => {
  const invalidate = useInvalidateAll();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => householdRequest<{ id: string }>("POST", `/occurrences/${encodeURIComponent(id)}/skip`, undefined, "household-occurrence-skip"),
    onSuccess: invalidate,
  });
};
