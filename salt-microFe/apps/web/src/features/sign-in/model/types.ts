/**
 * 로그인 계약 (`SRV-REQ-008` FR-10 · `BFF-REQ-009` 호출 맵 `login`).
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
  /** 갱신에 쓴다(`FE-REQ-011` FR-62). 목에는 이 필드가 없었다. */
  refreshToken: string;
}
