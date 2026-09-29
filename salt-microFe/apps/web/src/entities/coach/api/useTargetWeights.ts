"use client";

import type { TargetWeightResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** σ 는 하루 한 번 바뀐다. 보유 · 예산이 바뀌면 저장 쪽이 무효화한다 — 게이지와 같은 간격 */
const TARGET_WEIGHT_STALE_TIME_MS = 60_000;

const retryServerErrorOnce = (count: number, error: Error) =>
  count < 1 && !(error instanceof CoachApiError && error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR);

/**
 * 목표 비중 안내 (F010 슬라이스 5 `FE-REQ-041`). `/investments` [오늘의 판정] 카드 하나라 따로 부르고 따로 실패한다.
 * 토큰은 수화에 안전하게 읽는다(`useHasAccessToken`) — 모르는 동안(`null`)은 부르지 않는다.
 */
export const useTargetWeights = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery<TargetWeightResult, Error>({
    queryKey: coachQueryKeys.targetWeights(),
    queryFn: ({ signal }) => coachApi.targetWeights(signal),
    enabled: signedIn === true,
    staleTime: TARGET_WEIGHT_STALE_TIME_MS,
    retry: retryServerErrorOnce,
  });
  return { ...query, isSignedOut: signedIn === false };
};
