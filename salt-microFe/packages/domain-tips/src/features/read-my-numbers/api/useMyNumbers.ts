"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, readApiError, useHasSession } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { tipQueryKeys, type MyNumbers } from "@/entities/tip";

const fetchMyNumbers = async (slug: string, signal: AbortSignal): Promise<MyNumbers> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/tips/${encodeURIComponent(slug)}/my-numbers`, { signal });
  if (!response.ok) throw await readApiError(response, "tip-my-numbers");
  return (await response.json()) as MyNumbers;
};

/**
 * 내 숫자로 다시 읽기(FR-3) — 로그인했을 때만 부른다(공개 글을 읽는 사람에게 401 을 만들지 않는다). 로그아웃이면 `isSignedOut`.
 * 급여가 든 응답이라 브라우저 캐시에 오래 두지 않는다 — 화면을 떠나면 버린다(`gcTime` 0).
 */
export const useMyNumbers = (slug: string) => {
  const signedIn = useHasSession();
  const query = useQuery({
    queryKey: tipQueryKeys.myNumbers(slug),
    queryFn: ({ signal }) => fetchMyNumbers(slug, signal),
    enabled: signedIn === true,
    gcTime: 0,
    retry: false,
  });
  return { ...query, isSignedOut: signedIn === false };
};
