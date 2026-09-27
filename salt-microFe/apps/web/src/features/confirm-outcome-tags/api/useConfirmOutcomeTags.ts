"use client";

import type { DecisionOutcomeView } from "@repo/core/coach";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";

import { ConfirmOutcomeTagsApiError, confirmOutcomeTagsApi } from "./confirmOutcomeTagsApi";

export interface ConfirmOutcomeTagsVariables {
  id: string;
  tags: string[];
}

/**
 * 태그 확정. 성공하면 목록과 미러를 다시 부른다 — 태그 손익 · 엣지 배지가 확정 태그로 다시 세진다.
 * 낙관적 갱신 없음(태그 손익이 금액이다). 재시도 0회.
 */
export const useConfirmOutcomeTags = () => {
  const queryClient = useQueryClient();
  return useMutation<DecisionOutcomeView, ConfirmOutcomeTagsApiError, ConfirmOutcomeTagsVariables>({
    mutationFn: ({ id, tags }) => confirmOutcomeTagsApi.confirm(id, { tags }),
    retry: 0,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: coachQueryKeys.outcomes() }),
        queryClient.invalidateQueries({ queryKey: coachQueryKeys.mirror() }),
        queryClient.invalidateQueries({ queryKey: coachQueryKeys.sizeCheckAll() }),
      ]),
  });
};
