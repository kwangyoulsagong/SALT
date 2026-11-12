"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, readApiError, retryWhileRetriable, useHasSession } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** `GET /api/app/me/data-scope` — 지워지는 서비스(지우는 순서 그대로). 목록 · 순서는 BFF 것, 문구만 화면(`FE-REQ-055` FR-5) */
export const ERASE_SCOPE_ENDPOINT = "/api/app/me/data-scope";

export interface EraseScope {
  services: string[];
}

const fetchScope = async (signal?: AbortSignal): Promise<EraseScope> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${ERASE_SCOPE_ENDPOINT}`, { signal });
  if (!response.ok) throw await readApiError(response, "erase scope");
  const body = (await response.json()) as { services?: unknown };
  return { services: Array.isArray(body.services) ? body.services.filter((s): s is string => typeof s === "string") : [] };
};

/** 로그인하지 않았으면 부르지 않는다. 한 번만 다시 */
export const useEraseScope = () => {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: ["me", "erase-scope"],
    queryFn: ({ signal }) => fetchScope(signal),
    enabled: signedIn === true,
    staleTime: Infinity,
    retry: retryWhileRetriable(1),
  });
};
