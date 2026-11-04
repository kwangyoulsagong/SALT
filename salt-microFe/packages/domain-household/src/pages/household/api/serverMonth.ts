import { cookies } from "next/headers";

import { ACCESS_COOKIE, INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { HouseholdMonth } from "@/entities/household";

/** 서버 조회 상한 — 넘으면 비우고 브라우저가 부른다(첫 화면을 붙잡지 않는다) */
const SERVER_FETCH_TIMEOUT_MS = 1_500;

/**
 * 월 화면 서버 조회 — httpOnly 쿠키의 토큰으로 BFF 를 부른다(저축 `serverGoals` 와 같은 꼴, `FE-REQ-013` FR-80 1단계). 첫 숫자가 HTML 에 실린다.
 * 쿠키가 없거나 실패 · 시간 초과면 null — 화면은 브라우저 조회로 그린다.
 */
export const serverMonth = async (ym: string): Promise<HouseholdMonth | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${INVESTMENTS_BASE_URL}/api/app/household/month/${encodeURIComponent(ym)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as HouseholdMonth) : null;
  } catch {
    return null;
  }
};
