/** `FE-REQ-071` FR-6 — 셸 `/` · 휴대폰 `/m/login` 이 같이 쓰는 로그인 계약 · 호출 */
import { INVESTMENTS_BASE_URL } from "../config";

import { ApiError } from "./apiError";
import { apiFetch } from "./apiFetch";

/**
 * 로그인 계약 — `FE-REQ-071` FR-6 에서 셸 `features/sign-in` 의 계약 · 호출을 여기로 내렸다(서버 `POST /api/auth/login`, BFF 통과 경로 `login`).
 *
 * ## 목이 아니라 서버 계약이다 (2026-09-23 정정)
 *
 * 이 타입은 `POST /api/v1/auth/login` 의 **MSW 목**을 따라 `{ id, password }` → `{ token }`
 * 이었다. 실제 서버는 `POST /api/auth/login` 에서 `{ email, password }` 를 받고
 * `{ user, accessToken, refreshToken }` 을 준다. 목이 진짜처럼 통과하는 동안 화면은
 * `mock-jwt-token` 을 저장했고, 그 토큰으로 `/api/app/*` 를 부르면 전부 401 이었다 —
 * **로그인은 성공한 것처럼 보이고 데이터만 없는 상태**가 만들어졌다.
 */

export interface SignInRequest {
  email: string;
  password: string;
}

/** 서버 `AccountView` 에서 화면이 쓰는 것만. `id` 는 uuid 문자열이다. */
export interface SignInUser {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
}

export interface SignInResponse {
  user: SignInUser;
  accessToken: string;
  /** 갱신에 쓴다. 목에는 이 필드가 없었다. */
  refreshToken: string;
}



/**
 * 로그인 경로는 **BFF 프록시**다 — 셸 `/` 와 휴대폰 `/m/login` 이 같이 쓴다(2026-11-20 셸 `features/sign-in` 에서 내림).
 *
 * 화면은 원래 `/api/app/*` 만 부른다(`entities/auth/api/endpoints.ts` 주석). 그런데 로그인과
 * 갱신에는 앱 대면 계약이 **없다** — BFF 가 서버 경로를 그대로 통과시킨다. 그래서 여기 두
 * 경로만 서버 봉투(`{ success, message, data }`)를 보게 되고, **벗기는 자리를 이 파일 하나로**
 * 묶었다. 앱 대면 계약(`/api/app/auth/*`)이 생기면 이 파일만 바뀐다.
 */
const LOGIN_PATH = "/api/auth/login";

/** 서버 봉투. `data` 없이 오는 경우(프록시 오류)도 받는다. */
interface LoginEnvelope {
  code?: string;
  data?: SignInResponse;
}

/** 폼은 `@repo/web-shared/layout` `SignInForm` — 셸 · 휴대폰 zone 이 같은 계약 · 같은 세션 저장을 쓴다 */
export const signInApi = {
  signIn: async (body: SignInRequest): Promise<SignInResponse> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 남은 세션을 싣지 않는다 — 로그인은 새 사람으로 시작한다(같은 origin 이라 쿠키가 저절로 실린다)
      credentials: "omit",
    });

    const envelope = (await response
      .json()
      .catch(() => null)) as LoginEnvelope | null;

    // 본문은 토큰을 꺼내려고 이미 읽었다 — `readApiError` 대신 같은 모양을 직접 만든다
    if (!response.ok) {
      throw new ApiError("sign-in", response.status, typeof envelope?.code === "string" ? envelope.code : null);
    }
    // 200 인데 토큰이 없으면 계약이 깨진 것이다. 빈 세션을 저장하지 않는다 —
    // 저장하면 "로그인됨 + 데이터 없음" 이라는 그 상태가 다시 만들어진다.
    if (!envelope?.data?.accessToken || !envelope.data.refreshToken) {
      throw new ApiError("sign-in", response.status);
    }

    return envelope.data;
  },
};
