/**
 * 인증 저장 키 — 단일 소스는 `@repo/core/auth` 다.
 *
 * 쿠키 기반으로 옮기는 작업(`FE-REQ-013`)이 한 곳에서 끝나도록 앱은 여기만 본다.
 */
export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  PUBLIC_PATHS,
} from "@repo/core/auth";
