import { apiFetch } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type { SignInRequest, SignInResponse } from "../model/types";

/**
 * 로그인 경로는 **BFF 프록시**다 (`BFF-REQ-009` 호출 맵 `login`).
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

/** 상태 코드와 서버 코드를 들고 던진다 — 문구는 화면이 고른다. */
export class SignInError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null
  ) {
    super(`sign-in ${status}${code ? ` ${code}` : ""}`);
  }
}

/** mutation 은 feature 가 갖는다 (`fsd-entities.md` — entities/api 는 조회만). */
export const signInApi = {
  signIn: async (body: SignInRequest): Promise<SignInResponse> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const envelope = (await response
      .json()
      .catch(() => null)) as LoginEnvelope | null;

    if (!response.ok) {
      throw new SignInError(response.status, envelope?.code ?? null);
    }
    // 200 인데 토큰이 없으면 계약이 깨진 것이다. 빈 세션을 저장하지 않는다 —
    // 저장하면 "로그인됨 + 데이터 없음" 이라는 그 상태가 다시 만들어진다.
    if (!envelope?.data?.accessToken || !envelope.data.refreshToken) {
      throw new SignInError(response.status, null);
    }

    return envelope.data;
  },
};
