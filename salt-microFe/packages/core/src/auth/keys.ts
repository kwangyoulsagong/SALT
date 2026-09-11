/**
 * 인증 저장 키 (FE-REQ-007 FR-32).
 *
 * > **주의.** 현재 토큰은 `localStorage`에 있고, 그래서 **zone 간 공유가 되지 않는다.**
 * > 세금 zone이 인증을 공유하려면 쿠키 기반으로 옮겨야 한다. `FE-REQ-013`(F000 API)에서 다룬다.
 * > 키 이름을 여기에 모아 둔 이유가 그 이관을 한 곳에서 하기 위해서다.
 */
export const ACCESS_TOKEN_KEY = "ACCESS_TOKEN";
export const REFRESH_TOKEN_KEY = "REFRESH_TOKEN";
export const USER_KEY = "USER";

/** 로그인 없이 접근 가능한 경로 */
export const PUBLIC_PATHS = ["/login", "/signup", "/"];
