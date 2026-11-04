"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdQueryKeys, householdRequest, type HouseholdFixedCost, type RecurringTemplate } from "@/entities/household";

/**
 * 고정비 찾기 쓰기(가계부 S1e `FE-REQ-057` FR-11 · `SRV-REQ-046` FR-12). 재시도하지 않는다.
 * 성공하면 가계부 조회 전부를 다시 받는다 — 후보 목록 · 반복 예정 · 착지가 같이 바뀐다.
 */
const useInvalidateAll = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
};

/** "고정비 아니에요" · 되돌리기 — 키는 서버가 준 그대로 본문으로 */
export const useHideFixedCost = () => {
  const invalidate = useInvalidateAll();
  return useMutation<{ key: string }, Error, { key: string; hide: boolean }>({
    mutationFn: ({ key, hide }) => householdRequest<{ key: string }>("POST", hide ? "/fixed-costs/hide" : "/fixed-costs/show", { key }, "household-fixed-cost-hide"),
    onSuccess: invalidate,
  });
};

/**
 * 매달 적기로 옮기기 — 서버가 준 칸(이름 = 가맹점 · 마지막 금액 · 분류 · 결제수단 · 결제일)을 그대로 반복 템플릿으로.
 * 확인하고 적는 방식(confirmRequired) — 금액이 달마다 다를 수 있다. 이름이 가맹점과 같아 서버가 후보에서 뺀다
 */
export const useTemplateFromFixedCost = () => {
  const invalidate = useInvalidateAll();
  return useMutation<RecurringTemplate, Error, HouseholdFixedCost>({
    mutationFn: (c) =>
      householdRequest<RecurringTemplate>(
        "POST",
        "/templates",
        { name: c.merchant, amount: c.lastAmount, category: c.category, paymentMethod: c.paymentMethod, dayOfMonth: c.dayOfMonth, confirmRequired: true },
        "household-fixed-cost-template",
      ),
    onSuccess: invalidate,
  });
};
