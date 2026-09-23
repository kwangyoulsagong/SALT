/**
 * 액세스 토큰 갱신 호출 (`FE-REQ-011` FR-62).
 *
 * ## 왜 `shared/api` 인가 — `auth` 슬라이스가 아니고
 *
 * FSD 등록표는 "토큰 갱신"을 `auth` 슬라이스 책임으로 적는다(`FE-REQ-009` §4). 그런데
 * 갱신을 **부르는 쪽이 `shared/api` 의 `apiFetch`** 다. `shared` 는 `entities` 를 import
 * 할 수 없으므로(레이어 훅이 막는다) 구현이 슬라이스에 있으면 주입 장치가 필요하고,
 * 등록을 잊은 화면에서는 갱신이 조용히 없다.
 *
 * **토큰을 읽고 쓰는 자리가 이미 `shared/api/authToken.ts` 다**(같은 판단 · 같은 이유).
 * 갱신도 그 옆에 둔다. `auth` 슬라이스가 갖는 것은 세션 **화면**(초대 · 로그인)이다.
 *
 * ## 경로는 BFF 프록시다
 *
 * `POST /api/auth/refresh` 는 BFF 가 서버로 **그대로 통과**시킨다(`BFF-REQ-009` 호출 맵).
 * `/api/app/*` 가 아니다 — 앱 대면 계약이 따로 없고, 서버가 `{ accessToken }` 만 준다
 * (리프레시 토큰은 회전하지 않는다).
 */
import { singleFlight } from "@repo/core/auth";

import {
  HTTP_STATUS_CODE,
  INVESTMENTS_BASE_URL,
  PUBLIC_PATHS,
  ROUTES,
} from "@/shared/config";

import { clearSession, readRefreshToken, writeSession } from "./authToken";

/** BFF 가 서버로 통과시키는 경로. `/api/app/*` 가 아니다. */
const REFRESH_PATH = "/api/auth/refresh";

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
 * 로그인 화면에서 로그인 화면으로 보내는 일이 없게(`PUBLIC_PATHS` 의 첫 소비처다).
 */
const leaveForLogin = () => {
  if (typeof window === "undefined") return;
  if (PUBLIC_PATHS.includes(window.location.pathname)) return;

  window.location.replace(ROUTES.login);
};

interface RefreshEnvelope {
  data?: { accessToken?: string };
}

/**
 * 맨 `fetch` 를 쓴다 — `apiFetch` 를 쓰면 이 호출의 401 이 다시 갱신을 부른다.
 * 개발의 MSW 워커는 `/api/v1/*` 만 받으므로 목 게이트도 필요 없다.
 */
const requestRefresh = async (): Promise<string | null> => {
  const refreshToken = readRefreshToken();
  // 리프레시 토큰이 없으면 갱신할 것이 없다. 남은 액세스 토큰도 쓸모가 없으므로 비운다.
  if (!refreshToken) {
    clearSession();
    leaveForLogin();
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`${INVESTMENTS_BASE_URL}${REFRESH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // 네트워크 실패는 **세션을 비우지 않는다.** 토큰은 살아 있을 수 있고, 지우면
    // 오프라인 한 번에 로그아웃이 된다.
    return null;
  }

  if (!response.ok) {
    // 401 · 403 은 리프레시 토큰도 죽었다는 뜻이다 — 세션을 비워 화면이 로그인을 요구하게 한다.
    if (response.status === HTTP_STATUS_CODE.UNAUTHORIZED || response.status === 403) {
      clearSession();
      leaveForLogin();
    }
    return null;
  }

  const body = (await response.json().catch(() => null)) as RefreshEnvelope | null;
  const accessToken = body?.data?.accessToken;
  if (!accessToken) {
    clearSession();
    leaveForLogin();
    return null;
  }

  writeSession({ accessToken });
  return accessToken;
};

/** 동시에 뜬 401 여러 건이 갱신을 한 번만 부르게 한다(`RN-REQ-018` FR-13 과 같은 규칙). */
export const refreshAccessToken = singleFlight(requestRefresh);
