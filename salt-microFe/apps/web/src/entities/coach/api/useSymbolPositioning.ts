"use client";

import type { SymbolPositioningResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 배치가 하루 1회 만든다 — 한 화면 안에서 다시 부를 이유가 없다 */
const POSITIONING_STALE_TIME_MS = 10 * 60_000;

/**
 * 쏠림 신호(선물 펀딩비 · 김치 프리미엄) · 과거 반응 (F008 `FE-REQ-038` FR-14 · `FC-REQ-007`).
 *
 * 주요 사건과 같은 규칙: **404 는 "소유자가 아니다"** — 섹션을 그리지 않는다. 4xx 는 다시 부르지 않는다.
 * 토큰은 수화에 안전하게 읽는다(`useHasAccessToken`) — 모르는 동안(`null`)은 부르지도, "로그아웃"이라 하지도 않는다.
 */
export const useSymbolPositioning = (symbol: string) => {
  const signedIn = useHasAccessToken();

  const query = useQuery<SymbolPositioningResult, Error>({
    queryKey: coachQueryKeys.positioning(symbol),
    queryFn: ({ signal }) => coachApi.positioning(symbol, signal),
    enabled: signedIn === true && symbol !== "",
    staleTime: POSITIONING_STALE_TIME_MS,
    retry: (count, error) =>
      count < 1 &&
      !(
        error instanceof CoachApiError &&
        error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
      ),
  });

  const notOwner =
    query.error instanceof CoachApiError &&
    query.error.status === HTTP_STATUS_CODE.NOT_FOUND;
  return { ...query, notOwner, isSignedOut: signedIn === false };
};
