"use client";

import type { CoachProfileSettings } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasAccessToken, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 설정은 토글 · 설정 화면 저장 때만 바뀌고 저장 응답이 캐시에 들어간다 */
const PROFILE_STALE_TIME_MS = 5 * 60_000;

/**
 * 코치 설정 — 매입가 숨김(F009 FR-27 · `FE-REQ-039` FR-13) · 기본 모드 · 매도 돌아보는 기간(F004 FR-12 · `FE-REQ-026` FR-80).
 * 토큰이 없으면 부르지 않는다.
 *
 * 홈 보유 요약이 이 값으로 손익률을 숨긴다. **값이 오기 전에는 손익률을 보이지 않는다** — 숨김을 켠
 * 사람에게 한 번 보였다 사라지면 숨김이 아니다. 실패면 서버 기본(숨기지 않음)으로 본다.
 */
export const useCoachProfile = () => {
  // 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다(`/search` 수화 불일치, 2026-11-02)
  const signedIn = useHasAccessToken();

  const query = useQuery<CoachProfileSettings, Error>({
    queryKey: coachQueryKeys.profile(),
    queryFn: ({ signal }) => coachApi.profile(signal),
    enabled: signedIn === true,
    staleTime: PROFILE_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });

  return { ...query, isSignedOut: signedIn === false };
};
