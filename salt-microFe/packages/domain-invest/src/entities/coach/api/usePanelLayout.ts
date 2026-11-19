"use client";

import { useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/**
 * PC 패널 배치(F006 A절 · `FE-REQ-030` FR-55) — 이 사람만 바꾸는 값이라 화면을 연 동안 다시 부르지 않는다.
 * 저장은 `features/arrange-panels` 가 이 캐시를 덮어쓴다. 실패해도 기본 배치로 돈다(그 판단은 부르는 쪽)
 */
export const usePanelLayout = (enabled = true) => {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: coachQueryKeys.panelLayout(),
    queryFn: ({ signal }) => coachApi.panelLayout(signal),
    enabled: enabled && signedIn === true,
    staleTime: Infinity,
    retry: retryWhileRetriable(1),
  });
};
