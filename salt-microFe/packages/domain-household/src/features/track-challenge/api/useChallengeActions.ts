"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type Challenge } from "@/entities/household";

/**
 * 챌린지 쓰기(가계부 S1d `FE-REQ-057` FR-9). 재시도하지 않는다. 응답은 그 챌린지 한 장 — 목록 · 달력(한 날 스티커)을 다시 받는다.
 * 목표에 보태기는 BFF 가 가계부 · 저축 두 서비스를 순서대로 부른다(금액은 화면이 보내지 않는다 — 가계부 기록 그대로).
 */
const useChallengeMutation = <V,>(run: (vars: V) => Promise<Challenge>) => {
  const queryClient = useQueryClient();
  return useMutation<Challenge, Error, V>({
    mutationFn: run,
    // 목록 + 달력 스티커가 같이 바뀐다 — 가계부 조회 전부
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all }),
  });
};

const path = (id: string) => encodeURIComponent(id);

export const useMarkChallengeDay = () =>
  useChallengeMutation<{ id: string; date: string; on: boolean }>(({ id, date, on }) =>
    householdRequest<Challenge>(on ? "PUT" : "DELETE", `/challenges/${path(id)}/days/${path(date)}`, undefined, "household-challenge-day"),
  );

export const useRecordChallengeSaving = () =>
  useChallengeMutation<{ id: string; amount: number; note: string | null }>(({ id, amount, note }) =>
    householdRequest<Challenge>("POST", `/challenges/${path(id)}/savings`, note ? { amount, note } : { amount }, "household-challenge-saving"),
  );

export const useDeleteChallengeSaving = () =>
  useChallengeMutation<string>((savingId) => householdRequest<Challenge>("DELETE", `/challenge-savings/${path(savingId)}`, undefined, "household-challenge-saving-delete"));

export const useContributeSaving = () =>
  useChallengeMutation<{ savingId: string; goalId: string }>(({ savingId, goalId }) =>
    householdRequest<Challenge>("POST", `/challenge-savings/${path(savingId)}/contribute`, { goalId }, "household-challenge-contribute"),
  );

export const useEndChallenge = () =>
  useChallengeMutation<string>((id) => householdRequest<Challenge>("POST", `/challenges/${path(id)}/end`, undefined, "household-challenge-end"));
