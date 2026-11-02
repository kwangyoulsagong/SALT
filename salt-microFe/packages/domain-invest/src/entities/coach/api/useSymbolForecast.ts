"use client";

import type { SymbolForecastResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { hasApiStatus, useHasAccessToken, retryWhileRetriable } from "@repo/web-shared/api";
import { HTTP_STATUS_CODE } from "@repo/web-shared/config";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 배치가 하루 1회 만든다 — 한 화면 안에서 다시 부를 이유가 없다 */
const FORECAST_STALE_TIME_MS = 10 * 60_000;

/**
 * 가격 변동 범위 (F008 `FE-REQ-038` · `ADR-003`).
 *
 * **404 는 "소유자가 아니다"** — 에러가 아니라 상태다. 화면은 섹션 자체를 그리지 않는다(안내 문구도 없다).
 * 4xx 는 다시 부르지 않는다.
 */
export const useSymbolForecast = (symbol: string) => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다(`/search` 수화 불일치, 2026-11-02)
  const signedIn = useHasAccessToken();

  const query = useQuery<SymbolForecastResult, Error>({
    queryKey: coachQueryKeys.forecast(symbol),
    queryFn: ({ signal }) => coachApi.forecast(symbol, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: FORECAST_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  const notOwner = hasApiStatus(query.error, HTTP_STATUS_CODE.NOT_FOUND);
  return { ...query, notOwner, isSignedOut: signedIn === false };
};
