"use client";

import { useQuery } from "@tanstack/react-query";

import type { ArticleBody, ArticleBodyRef } from "@repo/core/newsBody";
import { apiFetch, readApiError, retryWhileRetriable, useHasSession } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { MARKET_ENDPOINTS } from "./endpoints";
import { marketQueryKeys } from "./queryKeys";

const pathOf = (ref: ArticleBodyRef) =>
  ref.kind === "coin" ? MARKET_ENDPOINTS.coinNewsBody(ref.id) : MARKET_ENDPOINTS.krNewsBody(ref.code, ref.serial);

export const getArticleBody = async (ref: ArticleBodyRef, signal?: AbortSignal): Promise<ArticleBody> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${pathOf(ref)}`, { signal });
  if (!response.ok) throw await readApiError(response, "articleBody");
  return ((await response.json()) as { data: ArticleBody }).data;
};

/**
 * 기사 본문(`FE-REQ-068`) — 모달이 열린 기사 하나만 부른다. 본문은 바뀌지 않는다(서버가 찾은 뒤 캐시) — 한 번 받으면 다시 부르지 않는다.
 * 없는 기사(`null`)면 부르지 않는다(공시 · 원천에 id 없음). 로그인일 때만 — 경로가 로그인 · 소유자 전용이라 비로그인은 요약 · 원문 링크로
 * (요청 0, 2026-11-09 확인 2회차)
 */
export const useArticleBody = (ref: ArticleBodyRef | null) => {
  const signedIn = useHasSession() === true;
  return useQuery({
    queryKey: [...marketQueryKeys.articleBody, ref?.kind ?? "", ref?.kind === "coin" ? ref.id : ref ? `${ref.code}/${ref.serial}` : ""],
    queryFn: ({ signal }) => getArticleBody(ref!, signal),
    enabled: ref !== null && signedIn,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: retryWhileRetriable(1),
  });
};
