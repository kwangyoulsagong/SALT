"use client";

import type { SymbolForecastResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
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
  const token = readAccessToken();

  const query = useQuery<SymbolForecastResult, Error>({
    queryKey: coachQueryKeys.forecast(symbol),
    queryFn: ({ signal }) => coachApi.forecast(symbol, signal),
    enabled: Boolean(token) && symbol !== "",
    staleTime: FORECAST_STALE_TIME_MS,
    retry: (count, error) =>
      count < 1 && !(error instanceof CoachApiError && error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR),
  });

  const notOwner = query.error instanceof CoachApiError && query.error.status === HTTP_STATUS_CODE.NOT_FOUND;
  return { ...query, notOwner, isSignedOut: !token };
};
