import { SESSION_HINT_COOKIE } from "@repo/core/auth";

/**
 * zone 간 탭 prerender 규칙 (`FE-REQ-054` FR-3, `ADR-005` §3).
 *
 * 대상은 **다른 zone 으로 가는 탭 링크만** — `ZoneNavigation` 이 그 `<a>` 에 표지 속성을 단다. 지금 탭(`aria-current`)은 뺀다.
 * `moderate` = 링크에 포인터를 잠깐 올리거나 누르기 시작할 때. Chromium 계열만 동작하고 나머지는 규칙을 무시한다(일반 이동).
 * 같은 zone 링크는 `next/link` 가 이미 prefetch 한다 — 여기 넣지 않는다.
 */
export const PRERENDER_TAB_ATTRIBUTE = "data-prerender-tab";

export const SPECULATION_RULES = {
  prerender: [
    {
      where: {
        and: [
          { selector_matches: `[${PRERENDER_TAB_ATTRIBUTE}]` },
          { not: { selector_matches: "[aria-current]" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
} as const;

/**
 * 로그인 상태에서만 건다 — 로그아웃이면 탭이 없거나(공개 화면) 도착 화면이 로그인으로 되돌아가 미리 렌더가 헛일이다.
 * 판단은 표지 쿠키(값 `1`, 토큰 아님 — `@repo/core/auth`). 서버에서 쿠키를 읽으면 루트 레이아웃이 동적 렌더가 되므로 브라우저가 판단한다.
 */
export const hasSessionHint = (cookie: string): boolean =>
  cookie.split(/;\s*/).includes(`${SESSION_HINT_COOKIE}=1`);
