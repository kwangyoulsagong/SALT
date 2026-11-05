/**
 * 웹 세션 쿠키 → 토큰 (`BFF-REQ-009` FR-54 · `FE-REQ-013` FR-80 2단계, 2026-11-05).
 *
 * 웹은 토큰을 httpOnly 쿠키(`salt_at`)로만 갖는다 — 브라우저 코드가 읽지 못하므로 `Authorization` 을 만들 수 없다. 그래서 BFF 가
 * 쿠키를 헤더로 바꾼다. 앱(RN)은 지금처럼 헤더를 보낸다 — **헤더가 있으면 쿠키를 보지 않는다.**
 *
 * 쿠키는 브라우저가 저절로 싣는다 — 다른 사이트가 사용자의 브라우저로 BFF 를 부르게 할 수 있다(CSRF · 웹소켓 가로채기).
 * 그래서 쿠키는 **같은 origin 에서 온 요청에서만** 토큰이 된다. 아니면 토큰 없는 요청으로 흘려보낸다(인증 경로는 401).
 */
import type { IncomingHttpHeaders } from "http";

/** 셸 Route Handler 가 쓰는 이름 — `@repo/core/auth` `ACCESS_COOKIE` 와 같아야 한다 */
export const ACCESS_COOKIE = "salt_at";

const MAX_TOKEN_LENGTH = 4096;

/** 쿠키 헤더에서 이름 하나 — 값은 디코드하지 않는다(JWT 는 URL 안전 문자뿐) */
export const readCookie = (header: string | undefined, name: string): string | undefined => {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 && value.length <= MAX_TOKEN_LENGTH ? value : undefined;
    }
  }
  return undefined;
};

const headerOf = (headers: IncomingHttpHeaders, name: string): string | undefined => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * HTTP 요청이 같은 origin 에서 왔나.
 *
 * | `Sec-Fetch-Site` | `Origin` | 판정 |
 * |---|---|---|
 * | `same-origin` · `none`(주소창) | — | 예 |
 * | `same-site` · `cross-site` | — | 아니오 |
 * | 없음(옛 브라우저 · 서버 호출) | 없음 | 예 — 브라우저가 다른 사이트 요청에 `Origin` 을 빼지 않는다 |
 * | 없음 | 허용 목록 안 | 예 |
 * | 없음 | 그 밖 | 아니오 |
 */
export const isSameOriginRequest = (headers: IncomingHttpHeaders, allowedOrigins: readonly string[]): boolean => {
  const site = headerOf(headers, "sec-fetch-site");
  if (site !== undefined) return site === "same-origin" || site === "none";
  const origin = headerOf(headers, "origin");
  return origin === undefined || allowedOrigins.includes(origin);
};

/**
 * 웹소켓 연결 요청은 브라우저가 `Sec-Fetch-Site: same-site` 로 보낸다(로컬은 포트가 달라 4002). 그래서 **`Origin` 허용 목록**만 본다 —
 * 브라우저는 웹소켓 연결에 `Origin` 을 반드시 싣는다. 없으면(브라우저가 아니다) 쿠키를 쓰지 않는다
 */
export const isAllowedSocketOrigin = (headers: IncomingHttpHeaders, allowedOrigins: readonly string[]): boolean => {
  const origin = headerOf(headers, "origin");
  return origin !== undefined && allowedOrigins.includes(origin);
};

/** 쿠키를 토큰으로 받을 웹 origin — `WEB_ORIGINS`(쉼표). 운영은 한 origin(`ADR-008`) */
export const webOrigins = (env: NodeJS.ProcessEnv = process.env): string[] =>
  (env.WEB_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
