import { NextResponse, type NextRequest } from "next/server";

import { MOBILE_REDIRECT_HEADERS, fromRequest, mobileRedirectOf } from "@repo/core/mobile";

/**
 * 휴대폰 문서 이동 → 대응 `/m` 주소(`FE-REQ-071` FR-7, `ADR-012`). 판정은 `@repo/core/mobile` 한 곳 — 데스크톱 zone 다섯이 같은 줄.
 * 운영은 한 origin 경로 라우팅이 이 zone 에 바로 보내므로(`ADR-008`) 셸 미들웨어만으로는 모자란다.
 */
export function middleware(request: NextRequest) {
  const to = mobileRedirectOf(fromRequest(request));
  if (to) return NextResponse.redirect(new URL(to, request.url), { status: 302, headers: MOBILE_REDIRECT_HEADERS });
  return NextResponse.next();
}

// `MOBILE_REDIRECT_MATCHER_SOURCE` 와 같은 글자 — Next 가 정적으로 읽는다
export const config = { matcher: ["/((?!_next/|api/|m/|m$|.*\\.[a-zA-Z0-9]+$).*)"] };
