import { NextResponse, type NextRequest } from "next/server";

import { SESSION_HINT_COOKIE } from "@repo/core/auth";

/**
 * 로그인한 사람이 `/`(로그인 화면)에 오면 **서버에서** 바로 홈으로 보낸다(2026-11-02).
 *
 * 전에는 로그인 화면을 먼저 그린 뒤 브라우저가 `localStorage` 토큰을 보고 `/home` 으로 옮겼다 — 로그인 화면이
 * 잠깐 보였다(사용자 지적). 토큰은 서버가 못 보지만, 세션을 저장할 때 같이 다는 표지 쿠키(값 `1`, 토큰 아님)는 본다.
 *
 * 표지는 "보낼지"만 정한다 — 인증이 아니다. 토큰이 죽었으면 홈의 첫 호출이 401 → 갱신 실패 → 세션과 표지를
 * 같이 비우고 로그인으로 온다. 그때는 표지가 없어 여기를 그냥 지나간다(되돌이 없음).
 * 비공개 경로 보호는 이 미들웨어의 일이 아니다 — 토큰이 쿠키로 간 뒤(`FE-REQ-013`).
 */
export function middleware(request: NextRequest) {
  if (request.cookies.get(SESSION_HINT_COOKIE)?.value === "1") {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
