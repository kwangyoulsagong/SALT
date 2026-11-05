/**
 * 인증 키 (FE-REQ-007 FR-32 → `FE-REQ-013` FR-80 2단계, 2026-11-05).
 *
 * **토큰은 브라우저 저장소에 없다.** 액세스 · 리프레시 토큰은 둘 다 httpOnly 쿠키다 — 자바스크립트가 읽지 못한다.
 * 쓰고 지우는 곳은 셸 Route Handler `SESSION_ROUTE` 하나(같은 origin — zone 이 같이 받는다). 브라우저는 BFF 를
 * 같은 origin 경로(`/api/*`)로 부르고, BFF 가 쿠키를 `Authorization` 으로 바꾼다(`BFF-REQ-009` FR-54).
 */
/** 사용자 정보(닉네임 · 이메일 · 사진) — 토큰이 아니다. 화면 머리를 그리는 데만 쓴다 */
export const USER_KEY = "USER";
/**
 * 1단계까지 토큰이 있던 `localStorage` 키 — **읽지 않는다.** 2단계 전에 로그인한 브라우저를 한 번 옮기고(`migrateLegacySession`)
 * 지우는 데만 쓴다. 옮길 사람이 없어지면 이 둘과 이관 함수를 같이 지운다
 */
export const LEGACY_ACCESS_TOKEN_KEY = "ACCESS_TOKEN";
export const LEGACY_REFRESH_TOKEN_KEY = "REFRESH_TOKEN";

/**
 * "이 브라우저에 로그인 세션이 있다"는 **표지 쿠키** — 값은 `1` 뿐, 토큰은 담지 않는다(2026-11-02). 자바스크립트가 읽는다.
 *
 * 셸 미들웨어가 이 쿠키를 보고 `/` 에서 바로 `/home` 으로 보내고, 화면은 이것으로 "로그인했나"를 안다(`useHasSession`) —
 * 토큰 쿠키는 httpOnly 라 읽을 수 없다. 세션 쿠키와 **같은 응답에서** 달고 지운다(Route Handler). 수명은 리프레시 토큰까지.
 * 토큰이 실제로 죽었으면 첫 호출이 401 → 갱신 실패 → 세션(과 이 쿠키)을 비우고 로그인으로 — 되돌이 없다.
 */
export const SESSION_HINT_COOKIE = "salt_signed_in";
/**
 * 액세스 토큰 **httpOnly 쿠키**(`FE-REQ-013` FR-80). 수명 = 토큰 `exp`. 브라우저 요청은 BFF 가, 서버 컴포넌트는 직접 읽어
 * `Authorization` 으로 싣는다.
 */
export const ACCESS_COOKIE = "salt_at";
/**
 * 리프레시 토큰 **httpOnly 쿠키** — 경로를 `SESSION_ROUTE` 로 좁힌다. BFF 로 가는 요청마다 실리지 않고, 갱신 Route Handler 만 받는다
 */
export const REFRESH_COOKIE = "salt_rt";
/** 세션 쿠키를 쓰고 지우는 같은 origin 경로 */
export const SESSION_ROUTE = "/api/session";
/** 리프레시 쿠키로 액세스 쿠키를 새로 받는 경로 — 브라우저는 토큰을 보지 않는다 */
export const SESSION_REFRESH_ROUTE = "/api/session/refresh";

/** 표지 · 리프레시 쿠키 수명 상한 — 실제 수명은 리프레시 토큰 `exp` 까지 */
export const SESSION_HINT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * 로그인 없이 접근 가능한 경로.
 *
 * `/onboarding` 이 여기 있는 이유: **계정이 생기는 경로가 그 화면**이다. 초대 코드를
 * 입력하는 사람에게는 아직 토큰이 없다.
 *
 * `/signup` 은 **없어졌다** — 회원가입 경로를 초대 코드로 대체했고 서버·BFF 에서 404 다
 * (`SRV-REQ-009` 제거 목록). 목록에 남겨 두면 없는 화면이 공개로 선언된 채 남는다.
 */
export const PUBLIC_PATHS = ["/login", "/onboarding", "/"];
