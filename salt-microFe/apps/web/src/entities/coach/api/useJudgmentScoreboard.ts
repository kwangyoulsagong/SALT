"use client";

import type { JudgmentScoreboardResult } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import { coachApi, CoachApiError } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 채점은 관찰 기간이 끝난 판단만 센다(단타 하루 · 장기 30일) — 화면에 머무는 동안 다시 부를 이유가 없다 */
const SCOREBOARD_STALE_TIME_MS = 30 * 60_000;

const retryServerErrorOnce = (count: number, error: Error) =>
  count < 1 && !(error instanceof CoachApiError && error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR);

/**
 * 판정 성적표 (F010 슬라이스 3 `FE-REQ-040` FR-6). `/investments` 카드 하나라 따로 부르고 따로 실패한다.
 * 토큰은 수화에 안전하게 읽는다(`useHasAccessToken`) — 모르는 동안(`null`)은 부르지도, "로그아웃"이라 하지도 않는다.
 */
export const useJudgmentScoreboard = () => {
  const signedIn = useHasAccessToken();
  const query = useQuery<JudgmentScoreboardResult, Error>({
    queryKey: coachQueryKeys.scoreboard(),
    queryFn: ({ signal }) => coachApi.scoreboard(signal),
    enabled: signedIn === true,
    staleTime: SCOREBOARD_STALE_TIME_MS,
    retry: retryServerErrorOnce,
  });
  return { ...query, isSignedOut: signedIn === false };
};
