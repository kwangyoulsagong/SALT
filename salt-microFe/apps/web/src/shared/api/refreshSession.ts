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

import { INVESTMENTS_BASE_URL, HTTP_STATUS_CODE } from "@/shared/config";

import { clearSession, readRefreshToken, writeSession } from "./authToken";

/** BFF 가 서버로 통과시키는 경로. `/api/app/*` 가 아니다. */
const REFRESH_PATH = "/api/auth/refresh";

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
    }
    return null;
  }

  const body = (await response.json().catch(() => null)) as RefreshEnvelope | null;
  const accessToken = body?.data?.accessToken;
  if (!accessToken) {
    clearSession();
    return null;
  }

  writeSession({ accessToken });
  return accessToken;
};

/** 동시에 뜬 401 여러 건이 갱신을 한 번만 부르게 한다(`RN-REQ-018` FR-13 과 같은 규칙). */
export const refreshAccessToken = singleFlight(requestRefresh);
