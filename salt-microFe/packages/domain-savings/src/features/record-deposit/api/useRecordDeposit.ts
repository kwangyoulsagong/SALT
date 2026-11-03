"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { goalQueryKeys, type SavingsGoalDetail } from "@/entities/goal";

import { recordDepositApi, type DepositRequest, type SplitRequest, type SplitResult } from "./recordDepositApi";

/** 쓰기는 재시도하지 않는다(중복 적립). 성공하면 응답으로 상세를 채우고 목록만 무효화 */
export const useRecordDeposit = (goalId: string) => {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoalDetail, Error, DepositRequest>({
    mutationFn: (body) => recordDepositApi.single(goalId, body),
    onSuccess: (detail) => {
      queryClient.setQueryData(goalQueryKeys.detail(goalId), detail);
      return queryClient.invalidateQueries({ queryKey: goalQueryKeys.list() });
    },
  });
};

export const useSplitDeposit = () => {
  const queryClient = useQueryClient();
  return useMutation<SplitResult, Error, SplitRequest>({
    mutationFn: recordDepositApi.split,
    onSuccess: (result) => {
      result.goals.forEach((detail) => {
        queryClient.setQueryData(goalQueryKeys.detail(detail.goal.id), detail);
      });
      return queryClient.invalidateQueries({ queryKey: goalQueryKeys.list() });
    },
  });
};
