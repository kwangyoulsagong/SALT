"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { goalQueryKeys } from "@/entities/goal";

import { CreateGoalRequest } from "../model/types";
import { addGoalApi } from "./addGoalApi";

/**
 * 목표 추가.
 *
 * 성공하면 목록 쿼리를 무효화한다. 홈 이동은 폼이 완료 장면을 보인 뒤에 한다(`FE-REQ-044` P-2) —
 * 곧바로 넘기면 "추가됐다"는 순간이 화면에 없다.
 * **낙관적 갱신을 하지 않는다**: 목표 카드에 금액이 들어가고, 금액 화면의 낙관적 갱신은
 * 금지다 (`fsd-features.md`).
 */
export const useAddGoal = (): UseMutationResult<
  void,
  Error,
  CreateGoalRequest
> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateGoalRequest>({
    mutationFn: addGoalApi.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [goalQueryKeys.mySummary] }),
        queryClient.invalidateQueries({
          queryKey: [goalQueryKeys.progressList],
        }),
      ]);
    },
  });
};
