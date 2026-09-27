"use client";

import type { BehaviorMirrorResult, DecisionOutcomeListResult, MonthlyReviewResult } from "@repo/core/coach";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 결과 · 라벨은 배치가 6시간마다 만든다 — 화면에 머무는 동안 다시 부를 이유가 적다 */
const MIRROR_STALE_TIME_MS = 5 * 60_000;
/** 태그를 고치는 목록. 최근 청산부터 이만큼 */
export const OUTCOME_LIST_LIMIT = 20;

const retryServerErrorOnce = (count: number, error: Error) =>
  count < 1 && !(error instanceof CoachApiError && error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR);

/**
 * 내 거래 미러 (F009 슬라이스 5 `FE-REQ-039`). 코치 리포트와 따로 부르고 따로 실패한다.
 * 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다.
 */
export const useBehaviorMirror = () => {
  const token = readAccessToken();
  const query = useQuery<BehaviorMirrorResult, Error>({
    queryKey: coachQueryKeys.mirror(),
    queryFn: ({ signal }) => coachApi.mirror(signal),
    enabled: Boolean(token),
    staleTime: MIRROR_STALE_TIME_MS,
    retry: retryServerErrorOnce,
  });
  return { ...query, isSignedOut: !token };
};

/** 청산별 결과 · 태그 — 태그 확정 목록 */
export const useDecisionOutcomes = () => {
  const token = readAccessToken();
  const query = useQuery<DecisionOutcomeListResult, Error>({
    queryKey: coachQueryKeys.outcomes(),
    queryFn: ({ signal }) => coachApi.outcomes(OUTCOME_LIST_LIMIT, signal),
    enabled: Boolean(token),
    staleTime: MIRROR_STALE_TIME_MS,
    retry: retryServerErrorOnce,
  });
  return { ...query, isSignedOut: !token };
};

/** 한 번 만든 복기는 바뀌지 않는다 — 화면에 머무는 동안 다시 부르지 않는다 */
const MONTHLY_REVIEW_STALE_TIME_MS = 60 * 60_000;

/**
 * 월간 복기 (F009 슬라이스 6 FR-28). `month` 가 `null` 이면 서버가 고른 지난달(KST).
 * 미러 · 리포트와 따로 부르고 따로 실패한다
 */
export const useMonthlyReview = (month: string | null) => {
  const token = readAccessToken();
  const query = useQuery<MonthlyReviewResult, Error>({
    queryKey: coachQueryKeys.monthlyReview(month),
    queryFn: ({ signal }) => coachApi.monthlyReview(month, signal),
    enabled: Boolean(token),
    staleTime: MONTHLY_REVIEW_STALE_TIME_MS,
    // 달을 바꾸는 동안 앞 달을 두고 자리를 지킨다 — 고르기 칸이 사라졌다 나타나지 않게
    placeholderData: keepPreviousData,
    retry: retryServerErrorOnce,
  });
  return { ...query, isSignedOut: !token };
};
