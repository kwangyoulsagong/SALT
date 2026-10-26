"use client";

import type {
  BehaviorMirrorResult,
  DecisionOutcomeListResult,
  KrBehaviorMirrorResult,
  MonthlyReviewResult,
} from "@repo/core/coach";
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

/**
 * 국내 주식 미러 (F011 FR-47). **404 는 "소유자가 아니다"** — 에러가 아니라 상태다(`notOwner`, 섹션을 그리지 않는다).
 * 코인 미러와 따로 부르고 따로 실패한다. 첫 요청은 서버가 복권형 단면을 세느라 몇 초 걸린다
 */
export const useKrBehaviorMirror = () => {
  const token = readAccessToken();
  const query = useQuery<KrBehaviorMirrorResult, Error>({
    queryKey: coachQueryKeys.krMirror(),
    queryFn: ({ signal }) => coachApi.krMirror(signal),
    enabled: Boolean(token),
    staleTime: MIRROR_STALE_TIME_MS,
    retry: retryServerErrorOnce,
  });
  const notOwner = query.error instanceof CoachApiError && query.error.status === HTTP_STATUS_CODE.NOT_FOUND;
  return { ...query, notOwner, isSignedOut: !token };
};

/** 청산별 결과 · 태그 — 태그 확정 목록. `kr_stock` 이면 국내 청산(국내 미러 섹션, F011 FR-47) */
export const useDecisionOutcomes = (assetType: "crypto" | "kr_stock" = "crypto") => {
  const token = readAccessToken();
  const isKr = assetType === "kr_stock";
  const query = useQuery<DecisionOutcomeListResult, Error>({
    queryKey: isKr ? coachQueryKeys.krOutcomes() : coachQueryKeys.outcomes(),
    queryFn: ({ signal }) => coachApi.outcomes(OUTCOME_LIST_LIMIT, signal, isKr ? assetType : undefined),
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
