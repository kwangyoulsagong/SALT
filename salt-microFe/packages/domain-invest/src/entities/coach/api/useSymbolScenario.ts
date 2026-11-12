"use client";

import type { SymbolScenarioResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { hasApiStatus, useHasSession, retryWhileRetriable } from "@repo/web-shared/api";
import { HTTP_STATUS_CODE } from "@repo/web-shared/config";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 예측은 매시 새로 나온다 — 화면 안에서는 5분 동안 다시 부르지 않는다 */
const SCENARIO_STALE_TIME_MS = 5 * 60_000;

/**
 * 시나리오 카드 — 단타 방향 확률(F017 v2 단계 5 · `FE-REQ-064` FR-4 · `ADR-003`).
 *
 * **404 는 "소유자가 아니다"** — 에러가 아니라 상태다. 화면은 자리 자체를 그리지 않는다(안내 문구도 없다).
 * 4xx 는 다시 부르지 않는다.
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

  const notOwner = hasApiStatus(query.error, HTTP_STATUS_CODE.NOT_FOUND);
  return { ...query, notOwner, isSignedOut: signedIn === false };
};
