"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { goalQueryKeys } from "@/entities/goal";
import { ROUTES } from "@/shared/config";

import { CreateGoalRequest } from "../model/types";
import { addGoalApi } from "./addGoalApi";

/**
 * 목표 추가.
 *
 * 성공하면 목록 쿼리를 무효화하고 홈으로 보낸다 — 방금 만든 목표가 보여야 완결이다.
 * **낙관적 갱신을 하지 않는다**: 목표 카드에 금액이 들어가고, 금액 화면의 낙관적 갱신은
 * 금지다 (`fsd-features.md`).
 */
export const useAddGoal = (): UseMutationResult<
  void,
  Error,
  CreateGoalRequest
> => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, Error, CreateGoalRequest>({
    mutationFn: addGoalApi.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [goalQueryKeys.mySummary] }),
        queryClient.invalidateQueries({
          queryKey: [goalQueryKeys.progressList],
        }),
      ]);
      router.push(ROUTES.home);
    },
  });
};
