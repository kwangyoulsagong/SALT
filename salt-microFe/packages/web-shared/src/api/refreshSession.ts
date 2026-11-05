/**
 * 세션 갱신 호출 (`FE-REQ-011` FR-62 → `FE-REQ-013` FR-80 2단계, 2026-11-05).
 *
 * ## 왜 `shared/api` 인가 — `auth` 슬라이스가 아니고
 *
 * 갱신을 **부르는 쪽이 `shared/api` 의 `apiFetch`** 다. `shared` 는 `entities` 를 import 할 수 없으므로(레이어 훅이 막는다)
 * 구현이 슬라이스에 있으면 주입 장치가 필요하고, 등록을 잊은 화면에서는 갱신이 조용히 없다. 세션을 쓰고 지우는 자리가
 * 이미 `shared/api/session.ts` 다 — 갱신도 그 옆에 둔다.
 *
 * ## 경로는 셸 Route Handler 다 — 브라우저는 토큰을 보지 않는다
 *
 * 리프레시 토큰은 httpOnly 쿠키이고 경로가 `SESSION_ROUTE` 로 좁다. 같은 origin `SESSION_REFRESH_ROUTE` 가 그 쿠키로
 * BFF `POST /api/auth/refresh` 를 부르고 새 액세스 쿠키를 심는다. 이 함수는 성공 여부만 안다.
 */
import { isPublicPath, singleFlight } from "@repo/core/auth";

import { ROUTES, SESSION_REFRESH_ROUTE } from "../config";

import { clearSession } from "./session";

/**
 * 세션이 끝났으면 로그인으로 보낸다 (`FE-REQ-011` FR-62 후반).
 *
 * ## 왜 화면에 맡기지 않는가
 *
 * 401 만 올리면 화면마다 "로그인이 필요하다"를 따로 판단해야 하고, 실제로 그러지 않아서
 * 코치 패널은 세션이 끝난 것을 "지금 판단을 불러올 수 없습니다"로 그렸다 — 사용자는
 * 서버가 고장 난 줄 안다.
 *
 * `window.location.replace` 다(`router` 는 이 레이어에 없다). 히스토리를 남기지 않는 이유는
 * 뒤로 가기가 이미 죽은 화면으로 돌아가기 때문이다. **공개 경로에서는 아무것도 하지 않는다** —
 * 로그인 화면에서 로그인 화면으로 보내는 일이 없게, 공개 글을 읽던 사람을 로그인으로 보내지 않게(`isPublicPath` — 앱 내비와 같은 판정).
 */
const leaveForLogin = () => {
  if (typeof window === "undefined") return;
  // 공개 화면(로그인 · 공개 금융 팁 글)에서는 세션만 비우고 제자리 — 읽던 사람을 로그인으로 보내지 않는다
  if (isPublicPath(window.location.pathname)) return;

  window.location.replace(ROUTES.login);
};

/** Route Handler 가 "리프레시도 죽었다"고 답한 status — 이때만 세션을 비운다 */
const SESSION_DEAD = new Set([401, 403]);

const requestRefresh = async (): Promise<boolean> => {
  let response: Response;
  try {
    response = await fetch(SESSION_REFRESH_ROUTE, { method: "POST", credentials: "same-origin" });
  } catch {
    // 네트워크 실패는 **세션을 비우지 않는다.** 토큰은 살아 있을 수 있고, 지우면 오프라인 한 번에 로그아웃이 된다.
    return false;
  }
  if (response.ok) return true;
  // 401 · 403 은 리프레시 토큰도 죽었다(또는 없다) — 세션을 비워 화면이 로그인을 요구하게 한다. 5xx 는 비우지 않는다
  if (SESSION_DEAD.has(response.status)) {
    await clearSession();
    leaveForLogin();
  }
  return false;
};

/** 동시에 뜬 401 여러 건이 갱신을 한 번만 부르게 한다(`RN-REQ-018` FR-13 과 같은 규칙). */
export const refreshSession = singleFlight(requestRefresh);
