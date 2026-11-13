"use client";

import type { CoachPanel } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasSession, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 판단 · 해설은 10분, 기저율은 하루, 원인은 장중 분 단위로 바뀐다 — 화면 안에서는 1분 동안 다시 부르지 않는다 */
const PANEL_STALE_TIME_MS = 60_000;

/**
 * 한 장 패널(F017 v4 1d · `FE-REQ-064` FR-8). 로그인한 누구나(모델 확률 칸 · 내 기준은 서버가 사람마다 가른다).
 * 4xx 는 다시 부르지 않는다
 */
export const useCoachPanel = (symbol: string) => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다
  const signedIn = useHasSession();

  const query = useQuery<CoachPanel, Error>({
    queryKey: coachQueryKeys.panel(symbol),
    queryFn: ({ signal }) => coachApi.panel(symbol, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: PANEL_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  return { ...query, isSignedOut: signedIn === false };
};
