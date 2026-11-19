"use client";

import { type CoachConversationPage, type CoachHistoryKeep, type CoachMessage, mergeHistoryPages, nextHistoryCursor } from "@repo/core/coach";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { retryWhileRetriable, useHasSession } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 한 번에 불러오는 지난 메시지 수 — 첫 화면은 가볍게, 위로 올리면 같은 수만큼 더(F006 2단계) */
const HISTORY_PAGE_SIZE = 30;
/** 대화는 내가 묻기 전엔 바뀌지 않는다 — 묻기가 끝나면 이 키를 버린다 */
const HISTORY_STALE_TIME_MS = 5 * 60_000;

/**
 * 가장 최근 코치 대화와 그 메시지(F006 C절 FR-28 · `FE-REQ-031` FR-20 · `FE-REQ-032` FR-21) — 화면을 다시 열면 이어서 보고,
 * 위로 올리면 더 오래된 것을 불러온다(서버 역순 커서). 메시지는 오래된 것이 위로 오게 뒤집어 준다(서버는 최신이 앞).
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
  const messages = useInfiniteQuery({
    queryKey: coachQueryKeys.messages(conversationId ?? "none"),
    queryFn: ({ signal, pageParam }) => coachApi.coachMessages(conversationId ?? "", HISTORY_PAGE_SIZE, pageParam, signal),
    initialPageParam: null as string | null,
    // 같은 커서가 다시 오면 멈춘다 — 서버 · BFF 가 커서를 잃으면 첫 쪽이 되풀이돼 위로 끝없이 붙었다(2026-11-19 실측)
    getNextPageParam: (page: CoachConversationPage<CoachMessage>, _pages, _last, params: (string | null)[]) => nextHistoryCursor(page, params),
    enabled: conversationId !== null,
    staleTime: HISTORY_STALE_TIME_MS,
    retry: retryWhileRetriable(1),
    // 쪽마다 최신이 앞 — 오래된 것이 위로 펴고, 쪽이 겹쳐도 같은 메시지는 한 번
    select: (data): { messages: CoachMessage[]; keep: CoachHistoryKeep | null } => ({
      messages: mergeHistoryPages(data.pages),
      keep: data.pages[0]?.keep ?? null,
    }),
  });
  return {
    conversationId,
    messages: messages.data?.messages ?? [],
    /** 보관 한도 — 맨 위(더 없음)에 한 줄 */
    keep: messages.data?.keep ?? null,
    isLoading: signedIn === null || latest.isLoading || (conversationId !== null && messages.isLoading),
    // 첫 쪽 실패만 — 지난 쪽 실패는 `olderFailed`(위쪽 버튼 옆 한 줄). 둘을 섞으면 실패 문구가 두 번 나왔다
    isError: latest.isError || (messages.isError && !messages.isFetchNextPageError),
    isSignedOut: signedIn === false,
    hasOlder: messages.hasNextPage,
    isLoadingOlder: messages.isFetchingNextPage,
    /** 지난 쪽을 못 받았다 — 화면은 저절로 다시 부르지 않는다 */
    olderFailed: messages.isFetchNextPageError,
    loadOlder: () => {
      if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
    },
  };
};
