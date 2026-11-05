"use client";

import type { SymbolEventsResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { hasApiStatus, useHasSession, retryWhileRetriable } from "@repo/web-shared/api";
import { HTTP_STATUS_CODE } from "@repo/web-shared/config";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 배치가 하루 1회 만든다 — 한 화면 안에서 다시 부를 이유가 없다 */
const EVENTS_STALE_TIME_MS = 10 * 60_000;

/**
 * 주요 사건(거시 일정) · 과거 반응 (F008 `FE-REQ-038` FR-13 · `FC-REQ-005`).
 *
 * 전망과 같은 규칙: **404 는 "소유자가 아니다"** — 섹션을 그리지 않는다. 4xx 는 다시 부르지 않는다.
 */
export const useSymbolEvents = (symbol: string) => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다(`/search` 수화 불일치, 2026-11-02)
  const signedIn = useHasSession();

  const query = useQuery<SymbolEventsResult, Error>({
    queryKey: coachQueryKeys.events(symbol),
    queryFn: ({ signal }) => coachApi.events(symbol, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: EVENTS_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  const notOwner = hasApiStatus(query.error, HTTP_STATUS_CODE.NOT_FOUND);
  return { ...query, notOwner, isSignedOut: signedIn === false };
};
