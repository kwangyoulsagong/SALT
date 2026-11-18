"use client";

import { useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 브리핑은 화면을 연 때의 것 — 보유 · 위험 · 저장 추천이 몇 분 안에 바뀌지 않는다 */
const BRIEFING_STALE_TIME_MS = 5 * 60_000;

/** 오늘의 브리핑(F006 FR-21 · `FE-REQ-030` FR-31) — 대화 첫 메시지. 못 읽어도 대화는 막지 않는다(그 자리만 비움) */
export const useCoachBriefing = () => {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: coachQueryKeys.briefing(),
    queryFn: ({ signal }) => coachApi.coachBriefing(signal),
    enabled: signedIn === true,
    staleTime: BRIEFING_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
};
