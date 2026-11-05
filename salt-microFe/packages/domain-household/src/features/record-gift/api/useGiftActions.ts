"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type PersonEntry, type PersonEntryRequest } from "@/entities/household";

/** 사람 장부 쓰기(가계부 S1h). 재시도하지 않는다. 사람별 합 · 해 봉투가 같이 바뀌므로 사람 장부 조회 전부를 다시 받는다 */
const peopleKey = [...householdQueryKeys.all, "people"] as const;

const useGiftMutation = <T, V>(run: (vars: V) => Promise<T>) => {
  const queryClient = useQueryClient();
  return useMutation<T, Error, V>({ mutationFn: run, onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKey }) });
};

const path = (id: string) => encodeURIComponent(id);

export const useAddGift = () =>
  useGiftMutation<PersonEntry, PersonEntryRequest>((body) => householdRequest<PersonEntry>("POST", "/people/entries", body, "household-gift-add"));

export const useEditGift = () =>
  useGiftMutation<PersonEntry, { id: string; body: PersonEntryRequest }>(({ id, body }) =>
    householdRequest<PersonEntry>("PUT", `/people/entries/${path(id)}`, body, "household-gift-edit"),
  );

export const useDeleteGift = () =>
  useGiftMutation<{ deleted: boolean }, string>((id) => householdRequest<{ deleted: boolean }>("DELETE", `/people/entries/${path(id)}`, undefined, "household-gift-delete"));
