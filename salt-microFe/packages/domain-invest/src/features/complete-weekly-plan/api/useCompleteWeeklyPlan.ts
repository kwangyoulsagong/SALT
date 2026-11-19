"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { planQueryKeys, type CompleteWeeklyPlanInput, type CompleteWeeklyPlanVM, type WeeklyPlanVM } from "@/entities/plan";
import type { ApiError } from "@repo/web-shared/api";

import { completeWeeklyPlan } from "./completeApi";

/**
 * 체크 — **체크 상태만 낙관적**(`FE-REQ-023` FR-31 · 54: 금액 계산이 아니다). 보낸 금액(사용자가 친 정수 그대로 · 비우면 계획액)을
 * 그 자산의 실행 금액 자리에 먼저 두고, 실패면 되돌린다. 끝나면 주간 계획 · 월 합계 · 설정을 서버 값으로 다시 받는다(연속 · 누적은 서버 값, FR-34)
 */
export const useCompleteWeeklyPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<CompleteWeeklyPlanVM, ApiError, CompleteWeeklyPlanInput, { previous: WeeklyPlanVM | undefined }>({
    mutationFn: completeWeeklyPlan,
    retry: 0,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: planQueryKeys.weekly });
      const previous = queryClient.getQueryData<WeeklyPlanVM>(planQueryKeys.weekly);
      if (previous) {
        queryClient.setQueryData<WeeklyPlanVM>(planQueryKeys.weekly, {
          ...previous,
          items: previous.items.map((item) => {
            const sent = input.executions.find((e) => e.asset === item.asset);
            return sent ? { ...item, status: "executed", executedKrw: sent.amountKrw ?? item.amountKrw } : item;
          }),
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(planQueryKeys.weekly, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: planQueryKeys.all }),
  });
};
