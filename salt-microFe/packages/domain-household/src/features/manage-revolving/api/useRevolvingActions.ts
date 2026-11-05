"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type RevolvingList, type RevolvingRequest } from "@/entities/household";

/**
 * 리볼빙 명세서 쓰기(가계부 S1h). 재시도하지 않는다(두 장이 생긴다). 응답은 목록 한 장 —
 * 월 화면 띠도 같이 바뀌므로 가계부 조회 전부를 다시 받는다.
 */
const useRevolvingMutation = <V,>(run: (vars: V) => Promise<RevolvingList>) => {
  const queryClient = useQueryClient();
  return useMutation<RevolvingList, Error, V>({
    mutationFn: run,
    onSuccess: (list) => {
      queryClient.setQueryData(householdQueryKeys.revolving(), list);
      return queryClient.invalidateQueries({ queryKey: householdQueryKeys.all, refetchType: "inactive" });
    },
  });
};

const path = (id: string) => encodeURIComponent(id);

export const useAddRevolving = () =>
  useRevolvingMutation<RevolvingRequest>((body) => householdRequest<RevolvingList>("POST", "/revolving", body, "household-revolving-add"));

export const useEditRevolving = () =>
  useRevolvingMutation<{ id: string; body: RevolvingRequest }>(({ id, body }) =>
    householdRequest<RevolvingList>("PUT", `/revolving/${path(id)}`, body, "household-revolving-edit"),
  );

export const useEndRevolving = () =>
  useRevolvingMutation<string>((id) => householdRequest<RevolvingList>("POST", `/revolving/${path(id)}/end`, undefined, "household-revolving-end"));
