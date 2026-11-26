"use client";

import type { ExplanationHistory } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 지난 날 원문은 바뀌지 않고 "그 뒤 등락"만 시세를 따라 움직인다 — 화면 안에서는 5분 동안 다시 부르지 않는다 */
const EXPLANATION_HISTORY_STALE_TIME_MS = 5 * 60_000;

/**
 * 지난 날 해설(`FE-REQ-079` · `BFF-REQ-057`) — 해설 상자의 날짜 이동이 쓴다. 패널과 같이 로그인한 누구나.
 * 실패해도 오늘 해설은 그대로라 4xx 는 다시 부르지 않는다
 */
export const useExplanationHistory = (symbol: string, mode: "scalp" | "long_term") => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지 않는다
  const signedIn = useHasSession();

  return useQuery<ExplanationHistory, Error>({
    queryKey: coachQueryKeys.explanationHistory(symbol, mode),
    queryFn: ({ signal }) => coachApi.explanationHistory(symbol, mode, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: EXPLANATION_HISTORY_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
};
