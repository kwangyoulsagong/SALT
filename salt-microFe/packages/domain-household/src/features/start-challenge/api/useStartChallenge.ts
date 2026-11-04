"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type Challenge, type StartChallengeRequest } from "@/entities/household";

/** 챌린지 고르기(`FE-REQ-057` FR-9). 재시도하지 않는다(두 개가 생긴다). 성공하면 목록을 다시 받는다 — 상한 · 순서는 서버 값 */
export const useStartChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation<Challenge, Error, StartChallengeRequest>({
    mutationFn: (body) => householdRequest<Challenge>("POST", "/challenges", body, "household-challenge-start"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.challenges() }),
  });
};
