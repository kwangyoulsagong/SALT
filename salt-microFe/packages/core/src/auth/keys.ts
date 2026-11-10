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
/**
 * 게스트 토큰 **httpOnly 쿠키**(`FE-REQ-070` · `ADR-011`) — 로그인 없이 시장 데이터를 읽는 30분 토큰. 사람 쿠키(`ACCESS_COOKIE`)가
 * 없을 때만 BFF 가 헤더로 쓴다(`BFF-REQ-055` FR-1). 로그인하면 지운다
 */
export const GUEST_COOKIE = "salt_gt";
/**
 * "이 브라우저에 게스트 토큰이 있다" 표지 쿠키 — 값은 `1` 뿐(토큰 아님), 자바스크립트가 읽는다. `GUEST_COOKIE` 와 같은 응답 · 같은 수명.
 * 첫 호출 전에 게스트 토큰을 미리 받을지 정한다 — 없으면 첫 요청이 401 을 한 번 내고(콘솔 오류) 받는다(2026-11-10 실화면)
 */
export const GUEST_HINT_COOKIE = "salt_guest";
/** 게스트 토큰을 받아 `GUEST_COOKIE` 에 심는 같은 origin 경로 */
export const SESSION_GUEST_ROUTE = "/api/session/guest";

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
export const PUBLIC_PATHS = ["/login", "/onboarding", "/", "/tips"];

/**
 * 이 경로가 로그인 없이 보는 화면인가 — `/` 는 그 자리만, 나머지는 그 아래까지(`/tips/<slug>`).
 *
 * 판정은 여기 하나다. 앱 내비(탭을 숨기나)와 세션 갱신(죽은 세션이면 로그인으로 보내나)이 같은 답을 내야 한다 —
 * 둘이 따로 비교하던 때(내비는 접두, 갱신은 정확히 같음) 금융 팁 글(`/tips/<slug>`)에서 만료된 세션으로 퀴즈를 풀면
 * 공개 글을 읽던 사람을 로그인 화면으로 보냈다(2026-11-05 금융 팁 S2b 확인 2회차).
 *
 * `/tips` 는 공개 zone(`ADR-005` · `FE-REQ-058`) — 검색으로 들어온 사람이 읽는다. 개인 칸(맞힌 카드)은 그 화면이 로그아웃 안내를 그린다.
 */
const matchesAny = (paths: readonly string[], pathname: string): boolean =>
  paths.some((path) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)));

export const isPublicPath = (pathname: string): boolean => matchesAny(PUBLIC_PATHS, pathname);

/**
 * 로그인 없이 **게스트 토큰으로** 보는 투자 화면(`FE-REQ-070` FR-3 · `ADR-011`) — 앱 내비는 그대로 있다(공개 화면처럼 탭을 숨기지 않는다).
 * 시장 데이터는 보이고, 사람 · AI 칸은 화면이 유리막으로 덮는다. `/portfolio` · `/coach` 는 본문 전체가 유리막.
 */
export const GUEST_READABLE_PATHS = ["/investments", "/search", "/portfolio", "/coach"];

/**
 * 세션이 죽었을 때 로그인 화면으로 **보내지 않는** 경로 — 공개 화면 ∪ 게스트 화면. 세션 갱신 · 게스트 발급이 같은 판정을 읽는다.
 * 내비(탭 숨김)는 `isPublicPath` 만 본다 — 둘을 한 목록으로 합치면 투자 화면에서 레일이 사라진다
 */
export const isGuestReadablePath = (pathname: string): boolean =>
  isPublicPath(pathname) || matchesAny(GUEST_READABLE_PATHS, pathname);

/** 로그인 뒤 돌아올 주소 쿼리 이름(`FE-REQ-070` FR-6) */
export const SIGN_IN_NEXT_PARAM = "next";
const NEXT_MAX_LENGTH = 512;

/**
 * 돌아올 주소가 **우리 사이트 안 경로**인가 — 아니면 `null`(열린 리디렉트 막기). 허용: `/` 로 시작하는 경로 하나.
 * 거절: `//host`(프로토콜 상대) · `/\host`(브라우저가 `//` 로 읽는다) · 스킴 · 제어 문자 · 너무 긴 것 · 로그인 화면 자신.
 */
export const safeNextPath = (raw: string | null | undefined): string | null => {
  if (!raw || raw.length > NEXT_MAX_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  // 제어 문자 · 역슬래시 — 정규식 대신 코드 값으로(lint no-control-regex)
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || ch === "\\") return null;
  }
  if (raw === "/" || raw.startsWith("/?")) return null;
  return raw;
};

/** 로그인 화면 주소 — 지금 자리(`pathname + search`)로 돌아오게 */
export const signInHref = (loginPath: string, here: string): string => {
  const next = safeNextPath(here);
  return next ? `${loginPath}?${SIGN_IN_NEXT_PARAM}=${encodeURIComponent(next)}` : loginPath;
};
