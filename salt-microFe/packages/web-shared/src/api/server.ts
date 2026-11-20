/** 서버 컴포넌트 BFF 조회(`FE-REQ-072`) — 아래 본문 주석 */
import { cookies } from "next/headers";

import { ACCESS_COOKIE, BFF_SERVER_URL } from "../config";

/** 서버 조회 상한 — 넘으면 비우고 브라우저가 부른다(첫 화면을 붙잡지 않는다) */
const SERVER_FETCH_TIMEOUT_MS = 1_500;

/**
 * 서버 컴포넌트의 BFF 조회 하나 — httpOnly 쿠키의 토큰으로 `BFF_SERVER_URL` 을 부른다.
 * 쿠키가 없거나 실패 · 시간 초과면 `null` — 화면은 브라우저 조회로 그린다(첫 숫자가 HTML 에 실리는 것은 덤).
 *
 * **`api` 배럴 밖 입구**(`@repo/web-shared/api/server`) — `next/headers` 는 서버에서만 된다. 배럴에 두면 그 배럴을 읽는
 * 클라이언트 모듈이 전부 깨진다(`FE-REQ-072` — 휴대폰 진입점 넷이 같은 것을 쓰려고 내렸다)
 */
export const serverBffRead = async <T>(path: string): Promise<T | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${BFF_SERVER_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};
