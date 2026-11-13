"use client";

import type { SymbolScenarioResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasSession, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 과거 실제 결과는 하루 한 번 · 모델 예측은 매시 새로 나온다 — 화면 안에서는 5분 동안 다시 부르지 않는다 */
const SCENARIO_STALE_TIME_MS = 5 * 60_000;

/**
 * 시나리오 — 모든 종목 · 지평 넷에 늘(F017 v4 순서 1 · `FE-REQ-064` FR-8). 로그인한 누구나 본다
 * (모델 확률 칸만 소유자 — 서버가 가른다, `ADR-003`). 4xx 는 다시 부르지 않는다.
 */
export const useSymbolScenario = (symbol: string) => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다
  const signedIn = useHasSession();

  const query = useQuery<SymbolScenarioResult, Error>({
    queryKey: coachQueryKeys.scenario(symbol),
    queryFn: ({ signal }) => coachApi.scenario(symbol, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: SCENARIO_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  return { ...query, isSignedOut: signedIn === false };
};
