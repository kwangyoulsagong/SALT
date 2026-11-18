import { cookies } from "next/headers";

import { ACCESS_COOKIE, BFF_SERVER_URL } from "@repo/web-shared/config";

import type { AlertsVM } from "@/entities/notification";

/** 서버 조회 상한 — 넘으면 비우고 브라우저가 부른다(첫 화면을 붙잡지 않는다) */
const SERVER_FETCH_TIMEOUT_MS = 1_500;

/**
 * 알림 첫 쪽 서버 조회(`FE-REQ-032` FR-64) — httpOnly 쿠키의 토큰으로 BFF 를 부른다. 첫 목록이 HTML 에 실린다.
 * 쿠키가 없거나 실패 · 시간 초과면 null — 화면은 브라우저 조회로 그린다(실패를 화면 오류로 올리지 않는다).
 * 서버 조회는 부르는 페이지 슬라이스에 둔다(`performance-frontend.md` §7) — 저축 `serverGoals` 와 같은 꼴.
 */
export const serverAlerts = async (): Promise<AlertsVM | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${BFF_SERVER_URL}/api/app/alerts?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as AlertsVM) : null;
  } catch {
    return null;
  }
};
