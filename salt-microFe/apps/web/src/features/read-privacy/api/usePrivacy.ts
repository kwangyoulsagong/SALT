"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, readApiError, retryWhileRetriable, useHasSession } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** `GET /api/app/me/privacy` — 서비스마다 저장하는 것(등급 · 설명) · AI 로 가는 것. 목록 · 순서 · 설명은 BFF · 서버 것(`BFF-REQ-046` FR-10) */
export const PRIVACY_ENDPOINT = "/api/app/me/privacy";

export type PrivacyGrade = "sensitive" | "financial" | "record" | "unknown";

export interface Privacy {
  services: Array<{ service: string; unavailable: boolean; groups: Array<{ grade: PrivacyGrade; items: string[] }> }>;
  ai: { personal: boolean; jobs: Array<{ about: string; inputs: string[] }> } | null;
}

const fetchPrivacy = async (signal?: AbortSignal): Promise<Privacy> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${PRIVACY_ENDPOINT}`, { signal });
  if (!response.ok) throw await readApiError(response, "privacy");
  return (await response.json()) as Privacy;
};

/** 로그인하지 않았으면 부르지 않는다. 한 번만 다시 */
export const usePrivacy = () => {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: ["me", "privacy"],
    queryFn: ({ signal }) => fetchPrivacy(signal),
    enabled: signedIn === true,
    staleTime: Infinity,
    retry: retryWhileRetriable(1),
  });
};
