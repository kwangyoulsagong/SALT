"use client";

import type { CoachMessage } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 화면에 다시 보이는 지난 메시지 수 — 대화가 길어져도 첫 화면을 가볍게(위로 더 읽기는 다음 판) */
const HISTORY_MESSAGE_LIMIT = 30;
/** 대화는 내가 묻기 전엔 바뀌지 않는다 — 묻기가 끝나면 이 키를 버린다 */
const HISTORY_STALE_TIME_MS = 5 * 60_000;

/**
 * 가장 최근 코치 대화와 그 메시지(F006 C절 FR-28 · `FE-REQ-032`) — 화면을 다시 열면 이어서 본다.
 * 대화가 없으면 `conversationId: null` · 빈 목록. 메시지는 오래된 것이 위로 오게 뒤집어 준다(서버는 최신이 앞).
 */
export const useCoachConversationHistory = () => {
  const signedIn = useHasSession();
  const latest = useQuery({
    queryKey: coachQueryKeys.conversations(),
    queryFn: ({ signal }) => coachApi.coachConversations(1, signal),
    enabled: signedIn === true,
    staleTime: HISTORY_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
  });
  const conversationId = latest.data?.items[0]?.id ?? null;
  const messages = useQuery({
    queryKey: coachQueryKeys.messages(conversationId ?? "none"),
    queryFn: ({ signal }) => coachApi.coachMessages(conversationId ?? "", HISTORY_MESSAGE_LIMIT, signal),
    enabled: conversationId !== null,
    staleTime: HISTORY_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
    select: (page): CoachMessage[] => [...page.items].reverse(),
  });
  return {
    conversationId,
    messages: messages.data ?? [],
    isLoading: signedIn === null || latest.isLoading || (conversationId !== null && messages.isLoading),
    isError: latest.isError || messages.isError,
    isSignedOut: signedIn === false,
  };
};
