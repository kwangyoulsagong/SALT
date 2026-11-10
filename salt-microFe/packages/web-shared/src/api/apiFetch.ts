/**
 * 앱 API 의 fetch 진입점 (`fsd-shared.md` — "`shared/api` 가 BFF 호출의 유일한 경로다").
 *
 * ## 401 이면 토큰을 갱신하고 한 번 다시 보낸다 (`FE-REQ-011` FR-62)
 *
 * 액세스 토큰은 15분이다. 갱신을 호출하는 쪽에 두면 새 슬라이스가 그것을 잊고, 잊은
 * 화면은 로그인 15분 뒤 "데이터 없음"으로 보인다 — 2026-09-23 에 코치 패널 · 관심 목록 ·
 * 포트폴리오가 동시에 그렇게 죽어 있었다. **여기 두면 아무도 잊을 수 없다.**
 *
 * 규칙(1회 재시도 · 로그인 상태로 보낸 요청만 · 동시 401 은 갱신 1회)은 `@repo/core/auth` 에 있고 테스트가 붙어 있다.
 * 토큰은 httpOnly 쿠키라 여기서 헤더를 만들지 않는다 — 같은 origin 요청에 브라우저가 싣는다(`FE-REQ-013` FR-80 2단계).
 *
 * 2026-09-23 — MSW 목과 목 기동을 기다리던 게이트(`mockGate`)를 지웠다. 모든 호출이 실제 BFF 다.
 *
 * ## 410 은 개발 중에 콘솔로 알린다 (`FE-REQ-012` FR-43)
 *
 * 410 = 동면(ADR-002)으로 닫힌 경로다. 화면은 그것을 그냥 실패로 그리므로, 남은 호출을 개발 중에 찾으려면
 * 여기서 경로를 찍어야 한다. 운영 빌드에서는 찍지 않는다.
 */
import { withSessionRefresh } from "@repo/core/auth";

import { isGuestReadablePath } from "@repo/core/auth";

import { issueGuestSession, refreshSession } from "./refreshSession";
import { hasGuestHint, hasSession } from "./session";

const GONE = 410;

const warnIfGone = (input: RequestInfo | URL, response: Response): Response => {
  if (process.env.NODE_ENV !== "production" && response.status === GONE) {
    const url = input instanceof Request ? input.url : String(input);
    console.warn(`[apiFetch] 410 — 동면 경로를 아직 부른다: ${url}`);
  }
  return response;
};

/**
 * 로그인도 게스트 표지도 없이 게스트 화면(투자)에서 첫 호출이면 게스트 토큰부터 받는다(`FE-REQ-070` FR-2) — 그러지 않으면 첫 요청이
 * 401 을 한 번 내고(브라우저 콘솔 오류) 받는다. 받기는 단일 비행이라 동시 호출이 한 번만 부르고, 실패해도 그냥 보낸다(401 → 재시도 경로)
 */
const ensureGuest = async (): Promise<void> => {
  if (typeof window === "undefined" || hasSession() || hasGuestHint()) return;
  if (!isGuestReadablePath(window.location.pathname)) return;
  await issueGuestSession();
};

export const apiFetch: typeof fetch = withSessionRefresh({
  fetchImpl: async (input, init) => {
    await ensureGuest();
    return warnIfGone(input, await fetch(input, { credentials: "same-origin", ...init }));
  },
  hasSession,
  refreshSession,
  issueGuest: issueGuestSession,
});
