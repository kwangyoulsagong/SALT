"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { goalQueryKeys, type SavingsGoalDetail } from "@/entities/goal";

import type { AddGoalRequest } from "../model/types";
import { addGoalApi } from "./addGoalApi";

/** 만들기 뒤 목록만 무효화한다 — 상세는 응답으로 채운다(다시 부르지 않는다) */
export const useAddGoal = () => {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoalDetail, Error, AddGoalRequest>({
    mutationFn: addGoalApi.create,
    onSuccess: (detail) => {
      queryClient.setQueryData(goalQueryKeys.detail(detail.goal.id), detail);
      return queryClient.invalidateQueries({ queryKey: goalQueryKeys.list() });
    },
  });
};
