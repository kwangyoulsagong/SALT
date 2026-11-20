import { NextResponse, type NextRequest } from "next/server";

import { SESSION_HINT_COOKIE } from "@repo/core/auth";
import { MOBILE_PATHS, VIEW_COOKIE } from "@repo/core/mobile";

/**
 * 휴대폰 zone 미들웨어(`FE-REQ-071` FR-6 · FR-7).
 *
 * - `/m` · `/m/` → `/m/home`(설치 앱의 `start_url` 과 같은 곳)
 * - `/m/login` 에 로그인한 사람(표지 쿠키 — 인증이 아니다, 셸 `/` 와 같은 판정) → `/m/home`. 로그인 화면이 비치지 않게
 * - `/m` 문서로 오면 "데스크톱 화면으로 보기" 쿠키를 지운다 — 사용자가 휴대폰 화면을 고른 것. `/m/desktop` 자신은 빼고
 * - 데스크톱으로 되돌려 보내지 않는다(한 방향)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const toHome = () => NextResponse.redirect(new URL(MOBILE_PATHS.home, request.url));

  if (pathname === "/m" || pathname === "/m/") return toHome();
  if (pathname === MOBILE_PATHS.login && request.cookies.get(SESSION_HINT_COOKIE)?.value === "1") return toHome();

  const response = NextResponse.next();
  const isDocument = request.headers.get("sec-fetch-mode") === "navigate";
  if (isDocument && pathname !== MOBILE_PATHS.desktop && request.cookies.get(VIEW_COOKIE)) {
    response.cookies.delete({ name: VIEW_COOKIE, path: "/" });
  }
  return response;
}

// 문서 경로만 — 매니페스트 · 서비스 워커 · 아이콘 · 정적 파일은 건너뛴다
export const config = { matcher: ["/m", "/m/((?!icons/|sw\\.js|manifest\\.webmanifest).*)"] };
