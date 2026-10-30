"use client";

import type { CoachProfileSettings } from "@repo/core/coach";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";
import type { ApiError } from "@/shared/api";

import { togglePurchasePriceApi } from "./togglePurchasePriceApi";

/**
 * 매입가 숨김 저장. 금액이 아닌 표시 설정이라 **낙관적 갱신**을 한다(`fsd-features.md`) — 실패하면 되돌린다.
 * 성공 응답은 서버 값이라 그대로 캐시에 넣는다. 재시도 0회.
 */
export const useTogglePurchasePrice = () => {
  const queryClient = useQueryClient();
  const key = coachQueryKeys.profile();

  return useMutation<
    CoachProfileSettings,
    ApiError,
    boolean,
    { previous: CoachProfileSettings | undefined }
  >({
    mutationFn: togglePurchasePriceApi.save,
    retry: 0,
    onMutate: async (hidePurchasePrice) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CoachProfileSettings>(key);
      // 값이 없으면 토글이 그려지지 않는다 — 없는 캐시에 숨김 하나만 넣어 다른 칸을 비우지 않는다
      if (previous) queryClient.setQueryData<CoachProfileSettings>(key, { ...previous, hidePurchasePrice });
      return { previous };
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(key, result);
    },
  });
};
