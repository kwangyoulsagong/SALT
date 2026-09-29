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
      // 미러의 보유 대비 · 회전율 · 처분효과는 요청 때 센다 — 거래가 늘면 바뀐다(결과 · 태그는 배치 몫)
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.mirror() }),
      // 목표 비중의 "지금" 쪽이 보유다(F010 슬라이스 5)
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.targetWeights() }),
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
