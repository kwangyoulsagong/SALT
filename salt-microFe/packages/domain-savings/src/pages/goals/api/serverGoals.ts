import { cookies } from "next/headers";

import { ACCESS_COOKIE, BFF_SERVER_URL } from "@repo/web-shared/config";

import type { SavingsGoal, SavingsOverview } from "@/entities/goal";

/** 서버 조회 상한 — 넘으면 비우고 브라우저가 부른다(첫 화면을 붙잡지 않는다) */
const SERVER_FETCH_TIMEOUT_MS = 1_500;

/** 쿠키 토큰으로 저축 BFF 하나를 부른다 — 쿠키가 없거나 실패 · 시간 초과면 null(화면은 브라우저 조회로 그린다) */
const serverRead = async <T>(path: string): Promise<T | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${BFF_SERVER_URL}/api/app/savings${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};

/**
 * 목표 목록 서버 조회(`FE-REQ-056` FR-13 · `FE-REQ-013` FR-80) — httpOnly 쿠키의 토큰으로 BFF 를 부른다(서버라 절대 주소 `BFF_SERVER_URL`). 첫 숫자가 HTML 에 실린다.
 * 서버 조회는 부르는 페이지 슬라이스에 둔다(`performance-frontend.md` §7 — 엔티티 배럴은 클라이언트가 같이 쓴다).
 */
export const serverGoals = (): Promise<SavingsGoal[] | null> => serverRead<SavingsGoal[]>("/goals");

/** 목록 요약 띠(`FE-REQ-060` FR-2) — 합은 서버. 목록과 병렬로 부른다(`Promise.all`, 서버 워터폴 0) */
export const serverOverview = (): Promise<SavingsOverview | null> => serverRead<SavingsOverview>("/overview");
