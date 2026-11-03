"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { goalQueryKeys, type SavingsGoalDetail } from "@/entities/goal";

const SAVINGS = `${INVESTMENTS_BASE_URL}/api/app/savings`;

export interface AddItemUnitRequest {
  name: string;
  unitPrice: number;
}

const send = async (method: "POST" | "DELETE", url: string, body: unknown, name: string): Promise<SavingsGoalDetail> => {
  const response = await apiFetch(url, {
    method,
    headers: body === undefined ? authHeader() : { "Content-Type": "application/json", ...authHeader() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw await readApiError(response, name);
  return (await response.json()) as SavingsGoalDetail;
};

/** 응답(갱신된 상세 — 환산 개수는 서버)으로 상세를 채우고 목록의 한 줄 환산을 위해 목록만 무효화 */
const useDetailMutation = <V,>(goalId: string, run: (v: V) => Promise<SavingsGoalDetail>) => {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoalDetail, Error, V>({
    mutationFn: run,
    onSuccess: (detail) => {
      queryClient.setQueryData(goalQueryKeys.detail(goalId), detail);
      return queryClient.invalidateQueries({ queryKey: goalQueryKeys.list() });
    },
  });
};

export const useAddItemUnit = (goalId: string) =>
  useDetailMutation<AddItemUnitRequest>(goalId, (body) => send("POST", `${SAVINGS}/goals/${encodeURIComponent(goalId)}/units`, body, "savings-unit-add"));

export const useDeleteItemUnit = (goalId: string) =>
  useDetailMutation<string>(goalId, (unitId) =>
    send("DELETE", `${SAVINGS}/goals/${encodeURIComponent(goalId)}/units/${encodeURIComponent(unitId)}`, undefined, "savings-unit-delete"),
  );
