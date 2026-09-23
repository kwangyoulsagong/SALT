"use client";

import type { CoachReportResult } from "@repo/core/coach";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/**
 * 리포트는 워커가 10분마다 새로 만든다. 그보다 자주 부를 이유가 없고, 재생성 직후에는
 * 키를 무효화해 바로 부른다(`features/regenerate-coach`).
 */
const COACH_REPORT_STALE_TIME_MS = 60_000;
const COACH_REPORT_RETRY_COUNT = 1;

const shouldRetry = (failureCount: number, error: Error) =>
  failureCount < COACH_REPORT_RETRY_COUNT &&
  !(
    error instanceof CoachApiError &&
    error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
  );

/**
 * 코치 리포트 조회 (`FE-REQ-028` FR-1 · FR-3).
 *
 * ## 조회가 클라이언트다
 *
 * FR-1 은 서버 컴포넌트 조회를 적었다. 토큰이 `localStorage` 에 있어 서버가 볼 수 없다
 * (`FE-REQ-013` 전) — 상세 분석 페이지와 같은 사정이다(`useSymbolCoach`).
 *
 * 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다.
 */
export const useCoachReport = (): UseQueryResult<CoachReportResult> & {
  isSignedOut: boolean;
} => {
  const token = readAccessToken();

  const query = useQuery({
    queryKey: coachQueryKeys.report(),
    queryFn: ({ signal }) => coachApi.report(signal),
    enabled: Boolean(token),
    staleTime: COACH_REPORT_STALE_TIME_MS,
    retry: shouldRetry,
  });

  return { ...query, isSignedOut: !token } as UseQueryResult<CoachReportResult> & {
    isSignedOut: boolean;
  };
};
