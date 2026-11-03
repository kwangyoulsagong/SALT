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

/**
 * "이 브라우저에 로그인 세션이 있다"는 **표지 쿠키** — 값은 `1` 뿐, 토큰은 담지 않는다(2026-11-02).
 *
 * 토큰이 `localStorage` 에만 있어 서버는 로그인 여부를 모른다. 그래서 `/` 에 오면 로그인 화면을 먼저 그렸다가
 * 브라우저가 토큰을 보고 홈으로 옮겼다(사용자 "로그인 페이지 있다가 홈으로 가는데 바로 홈으로"). 셸 미들웨어가 이
 * 쿠키를 보고 서버에서 바로 `/home` 으로 보낸다. 세션을 저장할 때 같이 쓰고 비울 때 같이 지운다(`@repo/web-shared/api`).
 * 토큰이 실제로 죽었으면 홈의 첫 호출이 401 → 갱신 실패 → 세션(과 이 쿠키)을 비우고 로그인으로 — 되돌이 없다.
 * 쿠키 세션 전체 이관은 `FE-REQ-013`.
 */
export const SESSION_HINT_COOKIE = "salt_signed_in";
/**
 * 액세스 토큰 **httpOnly 쿠키**(`FE-REQ-013` FR-80 1단계, 2026-11-03). 서버 컴포넌트가 BFF 를 부를 때 읽는다 — 첫 숫자를 HTML 에.
 * 쓰고 지우는 곳은 셸 Route Handler `/api/session` 하나(같은 origin — zone 이 같이 받는다). 자바스크립트는 읽지 못한다.
 * 브라우저 저장소 토큰은 2단계(BFF 가 쿠키 → Authorization)까지 남는다.
 */
export const ACCESS_COOKIE = "salt_at";
/** 세션 쿠키를 쓰고 지우는 같은 origin 경로 */
export const SESSION_ROUTE = "/api/session";

/** 표지 쿠키 수명 — 비우는 쪽(로그아웃 · 갱신 실패)이 따로 있어 길게 둔다 */
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
