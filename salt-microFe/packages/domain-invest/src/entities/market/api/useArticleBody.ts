"use client";

import { useQuery } from "@tanstack/react-query";

import type { ArticleBody, ArticleBodyRef } from "@repo/core/newsBody";
import { apiFetch, readApiError, retryWhileRetriable } from "@repo/web-shared/api";
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
 * 없는 기사(`null`)면 부르지 않는다(공시 · 원천에 id 없음). ~~로그인일 때만~~ 2026-11-10 누구나(게스트 토큰 — `FE-REQ-070`)
 */
export const useArticleBody = (ref: ArticleBodyRef | null) => {
  return useQuery({
    queryKey: [...marketQueryKeys.articleBody, ref?.kind ?? "", ref?.kind === "coin" ? ref.id : ref ? `${ref.code}/${ref.serial}` : ""],
    queryFn: ({ signal }) => getArticleBody(ref!, signal),
    enabled: ref !== null,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: retryWhileRetriable(1),
  });
};
