"use client";

import type { SymbolCoachViewModel } from "@repo/core/coach";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** `FE-REQ-028` FR-81 */
const SYMBOL_COACH_STALE_TIME_MS = 30_000;
/** 5xx · 네트워크만 한 번 더. 4xx 는 다시 불러도 같다 */
const SYMBOL_COACH_RETRY_COUNT = 1;

const shouldRetry = (failureCount: number, error: Error) =>
  failureCount < SYMBOL_COACH_RETRY_COUNT &&
  !(
    error instanceof CoachApiError &&
    error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
  );

/**
 * 우측 AI 코치 패널의 종목 판단 (`FE-REQ-028` FR-80~83).
 *
 * ## 이전 데이터를 유지하지 않는다
 *
 * 시세 프리뷰 쿼리는 `keepPreviousData` 로 깜빡임을 막는다. **이 쿼리는 그러면 안 된다** —
 * 새 종목의 응답이 오기 전까지 **이전 종목의 판단이 새 종목 이름 아래에 보인다.**
 * 차트가 잠깐 이전 모양인 것과 판단 라벨이 다른 종목 것인 것은 무게가 다르다. 대신
 * 판단 자리를 같은 높이의 스켈레톤으로 채워 레이아웃이 흔들리지 않게 한다(`FE-REQ-029` FR-72).
 *
 * 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다(`useWatchlist` 와 같다).
 */
export const useSymbolCoach = (
  symbol: string | undefined,
): UseQueryResult<SymbolCoachViewModel> & { isSignedOut: boolean } => {
  const token = readAccessToken();

  const query = useQuery({
    queryKey: coachQueryKeys.symbol(symbol ?? ""),
    queryFn: ({ signal }) => coachApi.symbolDetail(symbol ?? "", signal),
    enabled: Boolean(token && symbol),
    staleTime: SYMBOL_COACH_STALE_TIME_MS,
    retry: shouldRetry,
  });

  return { ...query, isSignedOut: !token } as UseQueryResult<SymbolCoachViewModel> & {
    isSignedOut: boolean;
  };
};
