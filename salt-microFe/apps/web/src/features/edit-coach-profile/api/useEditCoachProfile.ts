"use client";

import type { CoachProfileSettings, CoachProfileUpdate } from "@repo/core/coach";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";
import type { ApiError } from "@/shared/api";

import { editCoachProfileApi } from "./editCoachProfileApi";

/**
 * 코치 설정 저장. 응답이 곧 새 설정이라 캐시에 그대로 넣는다.
 *
 * **낙관적 갱신 없음** — 매입가 숨김(표시 설정)과 달리 판단 · 리포트가 이 값으로 다시 계산된다. 저장이 끝난 뒤
 * 그 값을 쓰는 조회를 버린다(FR-82): 종목 판단(기본 모드) · 리포트 "최근 행동"(매도 돌아보는 기간). 재시도 0회.
 */
export const useEditCoachProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<CoachProfileSettings, ApiError, CoachProfileUpdate>({
    mutationFn: editCoachProfileApi.save,
    retry: 0,
    onSuccess: (result) => {
      queryClient.setQueryData(coachQueryKeys.profile(), result);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: coachQueryKeys.symbolAll() }),
        queryClient.invalidateQueries({ queryKey: coachQueryKeys.report() }),
      ]);
    },
  });
};
