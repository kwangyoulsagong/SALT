import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE } from "@repo/web-shared/config";

/**
 * 세션 쿠키 — 액세스 토큰을 httpOnly 쿠키로 쓰고 지운다(`FE-REQ-013` FR-80 1단계, 2026-11-03).
 *
 * Route Handler 를 두는 정당한 이유 하나(`fsd-app.md`): **브라우저가 만질 수 없는 쿠키**를 같은 origin 에 쓰는 일. zone 은 셸과 같은
 * origin(셸 rewrites) 이라 저축 zone 서버 컴포넌트가 이 쿠키를 받는다.
 *
 * - 토큰을 검증하지 않는다 — 운반만 한다. 검증은 BFF · 서버가 요청마다 한다. 모양(JWT 세 조각 · 길이)만 본다
 * - 수명 = 토큰 `exp` 까지(최대 하루). 갱신하면 브라우저가 다시 쓴다(`writeSession`)
 * - **다른 사이트가 남의 토큰을 심지 못하게** 같은 origin 요청만 받는다(`Sec-Fetch-Site` · `Origin`) — 로그인 CSRF
 */
const MAX_TOKEN_LENGTH = 4096;
const MAX_AGE_CAP_SECONDS = 60 * 60 * 24;

const isSameOrigin = (request: NextRequest): boolean => {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
};

/** JWT `exp` 까지 남은 초 — 읽을 수 없으면 null(쿠키를 쓰지 않는다) */
const secondsUntilExpiry = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { exp?: unknown };
    if (typeof payload.exp !== "number") return null;
    const left = Math.floor(payload.exp - Date.now() / 1000);
    return left > 0 ? Math.min(left, MAX_AGE_CAP_SECONDS) : null;
  } catch {
    return null;
  }
};

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export const writeSessionCookie = async (request: NextRequest): Promise<NextResponse> => {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "SESSION_CROSS_SITE" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { accessToken?: unknown } | null;
  const token = typeof body?.accessToken === "string" ? body.accessToken : null;
  const maxAge = token ? secondsUntilExpiry(token) : null;
  if (!token || maxAge === null) return NextResponse.json({ code: "SESSION_TOKEN_INVALID" }, { status: 400 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(ACCESS_COOKIE, token, cookieOptions(maxAge));
  return response;
};

export const clearSessionCookie = async (request: NextRequest): Promise<NextResponse> => {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "SESSION_CROSS_SITE" }, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  return response;
};
