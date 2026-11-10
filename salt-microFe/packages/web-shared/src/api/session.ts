/**
 * 브라우저 세션 — 저장 · 비우기 · "로그인했나" (`FE-REQ-013` FR-80 2단계, 2026-11-05).
 *
 * ## 토큰은 여기 없다
 *
 * 액세스 · 리프레시 토큰은 둘 다 httpOnly 쿠키다. 쓰고 지우는 곳은 셸 Route Handler(`SESSION_ROUTE`) 하나이고, 이 파일은 그
 * 경로를 부르기만 한다. 자바스크립트가 토큰을 쥐는 순간은 로그인 · 초대 수락 응답을 받아 넘기는 한 번뿐이다.
 * 1단계까지는 `localStorage` 에 있었다(`FE-REQ-008` §6-4 미달) — XSS 한 줄이면 토큰이 나가고, 서버 렌더는 로그인 여부를 몰랐다.
 *
 * ## "로그인했나"는 표지 쿠키로 안다
 *
 * 토큰 쿠키는 읽을 수 없다. Route Handler 가 같은 응답에 다는 표지(`SESSION_HINT_COOKIE`, 값 `1`)를 읽는다 — 인증이 아니라
 * "보낼 만한가"다. 토큰이 죽었으면 첫 호출이 401 → 갱신 실패 → 여기 `clearSession` 이 표지까지 지운다.
 *
 * ## 다른 사이트가 남의 토큰을 심지 못한다
 *
 * Route Handler 가 같은 origin 요청만 받는다(로그인 CSRF). 여기서는 `credentials: "same-origin"` 을 명시만 한다.
 */
import {
  LEGACY_ACCESS_TOKEN_KEY,
  LEGACY_REFRESH_TOKEN_KEY,
  SESSION_HINT_COOKIE,
  SESSION_ROUTE,
  USER_KEY,
  GUEST_HINT_COOKIE,
} from "../config";

/** 표지 쿠키가 있나 — 렌더 중에 부르지 않는다(서버는 모른다 — `useHasSession`) */
export const hasSession = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((pair) => pair === `${SESSION_HINT_COOKIE}=1`);
};

/** 게스트 표지 쿠키가 있나(`FE-REQ-070`) — 첫 호출 전에 게스트 토큰을 미리 받을지 */
export const hasGuestHint = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((pair) => pair === `${GUEST_HINT_COOKIE}=1`);
};

const removeLegacyTokens = (): void => {
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    // 프라이빗 모드 — 지울 것도 없다
  }
};

/**
 * 세션을 쿠키로 둔다 — **토큰을 쓰는 유일한 자리**. 성공해야 다음 요청이 로그인 상태다 — 부르는 쪽은 기다린 뒤 이동한다.
 *
 * ## 이 함수가 없어서 인증 호출이 전부 401 이었다 (2026-09-18)
 *
 * 토큰을 **읽는 코드만 있고 쓰는 코드가 없었다.** 화면은 "데이터가 없음"으로 그려 빌드도 타입체크도 통과한 채 조용히 깨져
 * 있었다. 그래서 쓰기를 한 곳에 모은다.
 */
export const writeSession = async (session: {
  accessToken?: string | null;
  refreshToken?: string | null;
}): Promise<boolean> => {
  if (typeof window === "undefined" || !session.refreshToken) return false;
  try {
    const response = await fetch(SESSION_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: session.accessToken ?? null, refreshToken: session.refreshToken }),
      credentials: "same-origin",
    });
    return response.ok;
  } catch {
    // 네트워크 실패 — 세션 없이 진행한다. 다음 인증 호출이 401 이고 그게 사용자에게 보이는 정직한 상태다
    return false;
  }
};

/**
 * 세션을 비운다 — 로그아웃, 또는 **리프레시까지 죽었을 때만**(`FE-REQ-011` FR-62). 네트워크 실패로 부르지 않는다 —
 * 오프라인 한 번에 로그아웃이 되면 사용자는 자기가 뭘 했는지 알 수 없다. 쿠키 셋(토큰 둘 · 표지)은 Route Handler 가 지운다.
 */
export const clearSession = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // 지울 수 없으면 다음 인증 호출이 401 이다
  }
  removeLegacyTokens();
  await fetch(SESSION_ROUTE, { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
};

/**
 * 2단계 전에 로그인한 브라우저를 한 번 옮긴다 — `localStorage` 토큰을 쿠키로 보내고 지운다. 프로바이더가 마운트 때 부른다.
 * Route Handler 가 받아 주면(쿠키를 썼다) · 거절하면(토큰이 죽었다) 둘 다 지운다. 네트워크 실패면 남겨 두고 다음 진입에 다시.
 * 옮길 사람이 없어지면(리프레시 수명 7일이 지나면) 이 함수와 `LEGACY_*` 키를 같이 지운다.
 */
export const migrateLegacySession = (): void => {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  try {
    accessToken = window.localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    refreshToken = window.localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    return;
  }
  if (accessToken === null && refreshToken === null) return;
  if (refreshToken === null) {
    removeLegacyTokens();
    return;
  }
  void fetch(SESSION_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, refreshToken }),
    credentials: "same-origin",
  })
    .then(() => removeLegacyTokens())
    .catch(() => undefined);
};
