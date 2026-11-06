"use client";

import { useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { notificationApi } from "./notificationApi";
import { notificationQueryKeys } from "./queryKeys";

/** 설정 화면에 있는 동안 다시 받지 않는다 — 바꾼 값은 저장 응답이 캐시에 넣는다 */
const PREFS_STALE_TIME_MS = 60_000;

/** 로그인하지 않았으면 부르지 않는다(상태지 실패가 아니다) */
export const useNotificationPrefs = () => {
  const signedIn = useHasSession();
  const query = useQuery({
    queryKey: notificationQueryKeys.prefs(),
    queryFn: ({ signal }) => notificationApi.prefs(signal),
    enabled: signedIn === true,
    staleTime: PREFS_STALE_TIME_MS,
    // 한 번만 다시 — 설정 칸이 몇 초씩 비어 있지 않게(실패면 안내 한 줄)
    retry: retryWhileRetriable(1),
  });
  return { ...query, isSignedOut: signedIn === false };
};
