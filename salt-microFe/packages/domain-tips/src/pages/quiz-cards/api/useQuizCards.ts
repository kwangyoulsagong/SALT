"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, readApiError, useHasSession } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { tipQueryKeys, type QuizCards } from "@/entities/tip";

const fetchQuizCards = async (signal: AbortSignal): Promise<QuizCards> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/tips/quiz-cards`, { signal });
  if (!response.ok) throw await readApiError(response, "tip-quiz-cards");
  return (await response.json()) as QuizCards;
};

/**
 * 맞힌 카드 모음(FR-8) — 로그인했을 때만 부른다. 로그아웃이면 `isSignedOut`.
 * 이 페이지에 둔다 — 브라우저 요청 · `"use client"` 훅이 엔티티 배럴에 있으면 배럴을 값으로 읽는 공개 서버 페이지(`/tips` · 글)의
 * 클라이언트 번들에 딸려 간다(`performance-frontend.md` §7, 2026-11-05 S2b `/tips` 143 → 147 kB)
 */
export const useQuizCards = () => {
  const signedIn = useHasSession();
  const query = useQuery({
    queryKey: tipQueryKeys.quizCards,
    queryFn: ({ signal }) => fetchQuizCards(signal),
    enabled: signedIn === true,
  });
  return { ...query, isSignedOut: signedIn === false };
};
