"use client";

import type { RecordTradeRequest, RecordTradeResult, TradePlanView } from "@repo/core/coach";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";

import { RecordTransactionApiError, recordTransactionApi } from "./recordTransactionApi";

/**
 * 거래 + 계획 저장 (F009 FR-10). 성공하면 그 종목 계획 · 리스크 게이지 · 사이즈 계산 캐시를 버린다
 * — 보유가 바뀌어 비중 · 월 손익이 달라졌다. 낙관적 갱신 없음(금액 화면, `fsd-features.md`). 재시도 0회.
 */
export const useRecordTrade = () => {
  const queryClient = useQueryClient();

  const invalidate = (symbol: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.plans(symbol) }),
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.riskBudget() }),
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.sizeCheckAll() }),
    ]);

  const record = useMutation<RecordTradeResult, RecordTransactionApiError, RecordTradeRequest>({
    mutationFn: recordTransactionApi.record,
    retry: 0,
    onSuccess: (result) => invalidate(result.transaction.symbol),
  });

  /** 계획만 다시 저장 — 거래는 이미 있다 */
  const retryPlan = useMutation<
    TradePlanView,
    RecordTransactionApiError,
    Parameters<typeof recordTransactionApi.savePlan>[0]
  >({
    mutationFn: recordTransactionApi.savePlan,
    retry: 0,
    onSuccess: (plan) => queryClient.invalidateQueries({ queryKey: coachQueryKeys.plans(plan.symbol) }),
  });

  return { record, retryPlan };
};
