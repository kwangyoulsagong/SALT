import { NextResponse, type NextRequest } from "next/server";

import {
  ACCESS_COOKIE,
  BFF_SERVER_URL,
  REFRESH_COOKIE,
  SESSION_HINT_COOKIE,
  SESSION_HINT_MAX_AGE_SECONDS,
  SESSION_ROUTE,
} from "@repo/web-shared/config";

/**
 * 세션 쿠키 — 토큰을 httpOnly 쿠키로 쓰고 지우고 갱신한다(`FE-REQ-013` FR-80 1단계 2026-11-03 → 2단계 2026-11-05).
 *
 * Route Handler 를 두는 정당한 이유 하나(`fsd-app.md`): **브라우저가 만질 수 없는 쿠키**를 같은 origin 에 쓰는 일. zone 은 셸과 같은
 * origin 이라 zone 서버 컴포넌트도 · BFF(같은 origin `/api/*`)도 이 쿠키를 받는다.
 *
 * | 쿠키 | httpOnly | 경로 | 수명 |
 * |---|---|---|---|
 * | `ACCESS_COOKIE` | 예 | `/` | 액세스 `exp` |
 * | `REFRESH_COOKIE` | 예 | `SESSION_ROUTE` — BFF 요청마다 실리지 않는다 | 리프레시 `exp`(상한 30일) |
 * | `SESSION_HINT_COOKIE`(값 `1`) | 아니오 — 화면 · 미들웨어가 읽는다 | `/` | 리프레시와 같다 |
 *
 * - 토큰을 검증하지 않는다 — 운반만 한다. 검증은 BFF · 서버가 요청마다 한다. 모양(JWT 세 조각 · 길이 · `exp`)만 본다
 * - **다른 사이트가 남의 토큰을 심거나 갱신을 부르지 못하게** 같은 origin 요청만 받는다(`Sec-Fetch-Site` · `Origin`) — 로그인 CSRF
 */
const MAX_TOKEN_LENGTH = 4096;
const ACCESS_MAX_AGE_CAP_SECONDS = 60 * 60 * 24;
/** 갱신 호출 상한 — BFF 통과 예산 1s(`BFF-REQ-009`)에 여유 */
const REFRESH_TIMEOUT_MS = 3_000;
const REFRESH_PATH = "/api/auth/refresh";

const isSameOrigin = (request: NextRequest): boolean => {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
};

const crossSite = () => NextResponse.json({ code: "SESSION_CROSS_SITE" }, { status: 403 });

/** JWT `exp` 까지 남은 초(상한 적용) — 읽을 수 없거나 지났으면 null(쿠키를 쓰지 않는다) */
export const secondsUntilExpiry = (token: unknown, cap: number, nowMs = Date.now()): number | null => {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { exp?: unknown };
    if (typeof payload.exp !== "number") return null;
    const left = Math.floor(payload.exp - nowMs / 1000);
    return left > 0 ? Math.min(left, cap) : null;
  } catch {
    return null;
  }
};

const secure = () => process.env.NODE_ENV === "production";

const setAccess = (response: NextResponse, token: string, maxAge: number) =>
  response.cookies.set(ACCESS_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge });

const setRefreshAndHint = (response: NextResponse, token: string, maxAge: number) => {
  response.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: secure(),
    path: SESSION_ROUTE,
    maxAge,
  });
  response.cookies.set(SESSION_HINT_COOKIE, "1", { httpOnly: false, sameSite: "lax", secure: secure(), path: "/", maxAge });
};

const clearAll = (response: NextResponse) => {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: secure(), path: SESSION_ROUTE, maxAge: 0 });
  response.cookies.set(SESSION_HINT_COOKIE, "", { httpOnly: false, sameSite: "lax", secure: secure(), path: "/", maxAge: 0 });
  return response;
};

/**
 * `POST /api/session` `{ accessToken?, refreshToken }` — 로그인 · 초대 수락 · 옛 `localStorage` 이관이 부른다.
 * 리프레시가 살아 있어야 쓴다. 액세스가 지났으면 액세스만 빼고 쓴다 — 첫 호출의 401 이 갱신으로 채운다.
 */
export const writeSessionCookie = async (request: NextRequest): Promise<NextResponse> => {
  if (!isSameOrigin(request)) return crossSite();
  const body = (await request.json().catch(() => null)) as { accessToken?: unknown; refreshToken?: unknown } | null;
  const refreshAge = secondsUntilExpiry(body?.refreshToken, SESSION_HINT_MAX_AGE_SECONDS);
  if (refreshAge === null) return NextResponse.json({ code: "SESSION_TOKEN_INVALID" }, { status: 400 });
  const response = new NextResponse(null, { status: 204 });
  setRefreshAndHint(response, body?.refreshToken as string, refreshAge);
  const accessAge = secondsUntilExpiry(body?.accessToken, ACCESS_MAX_AGE_CAP_SECONDS);
  if (accessAge !== null) setAccess(response, body?.accessToken as string, accessAge);
  return response;
};

/** `DELETE /api/session` — 로그아웃 · 갱신 실패. 쿠키 셋을 같이 지운다 */
export const clearSessionCookie = async (request: NextRequest): Promise<NextResponse> => {
  if (!isSameOrigin(request)) return crossSite();
  return clearAll(new NextResponse(null, { status: 204 }));
};

/**
 * `POST /api/session/refresh` — 리프레시 쿠키로 BFF 갱신을 부르고 새 액세스 쿠키를 심는다. 브라우저는 토큰을 보지 않는다.
 *
 * | BFF 답 | 이 응답 | 쿠키 |
 * |---|---|---|
 * | 2xx + `accessToken` | 204 | 액세스 새로 |
 * | 401 · 403 (리프레시 죽음) · 리프레시 쿠키 없음 | 401 | 셋 다 지움 |
 * | 그 밖(5xx · 연결 실패 · 시간 초과 · 모양 틀림) | 502 | 그대로 — 오프라인 한 번에 로그아웃하지 않는다 |
 */
export const refreshSessionCookie = async (request: NextRequest): Promise<NextResponse> => {
  if (!isSameOrigin(request)) return crossSite();
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const dead = () => clearAll(NextResponse.json({ code: "SESSION_EXPIRED" }, { status: 401 }));
  if (!refreshToken) return dead();

  let upstream: Response;
  try {
    upstream = await fetch(`${BFF_SERVER_URL}${REFRESH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ code: "SESSION_REFRESH_UNAVAILABLE" }, { status: 502 });
  }
  if (upstream.status === 401 || upstream.status === 403) return dead();
  const body = (await upstream.json().catch(() => null)) as { data?: { accessToken?: unknown } } | null;
  const accessToken = body?.data?.accessToken;
  const accessAge = secondsUntilExpiry(accessToken, ACCESS_MAX_AGE_CAP_SECONDS);
  if (!upstream.ok || accessAge === null) {
    return NextResponse.json({ code: "SESSION_REFRESH_UNAVAILABLE" }, { status: 502 });
  }
  const response = new NextResponse(null, { status: 204 });
  setAccess(response, accessToken as string, accessAge);
  return response;
};
