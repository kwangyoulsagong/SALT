import { cookies } from "next/headers";

import { ACCESS_COOKIE, INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { HouseholdStory } from "@/entities/household";

/** 서버 조회 상한 — 넘으면 비우고 브라우저가 부른다(월 화면 `serverMonth` 와 같은 값) */
const SERVER_FETCH_TIMEOUT_MS = 1_500;

/**
 * 이야기 카드 서버 조회(가계부 S1g) — httpOnly 쿠키의 토큰으로 BFF 를 부른다(`serverMonth` 와 같은 꼴). 첫 카드가 HTML 에 실린다.
 * 쿠키가 없거나 실패 · 시간 초과면 null — 화면은 브라우저 조회로 그린다.
 */
export const serverStory = async (period: string): Promise<HouseholdStory | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${INVESTMENTS_BASE_URL}/api/app/household/story/${encodeURIComponent(period)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as HouseholdStory) : null;
  } catch {
    return null;
  }
};
