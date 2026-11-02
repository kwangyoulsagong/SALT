# @repo/web-shared

웹 shared 레이어(FSD Layer 0) + zone 공용 레이아웃. 셸(`apps/web`)과 도메인 zone(`apps/web-*`) · `packages/domain-*` 가 같이 쓴다(2026-11-02 `FE-REQ-053`).

| 입구 | 내용 |
|---|---|
| `@repo/web-shared/api` | `apiFetch` · `ApiError` · 세션(토큰 · 로그인 표지 쿠키) · `useHasAccessToken` · `useSessionUser` · SSE · WebSocket |
| `@repo/web-shared/config` | 라우트 · env(`ZONE_APP` 포함) · 네트워크 · SEO · zone 판정 재수출 |
| `@repo/web-shared/i18n` · `lib` · `model` · `ui` | 도메인 무관 문구 · 포맷터(`useZoneNavigate` 포함) · 공통 타입 · `BlockBoundary` · `CrossZoneLink` · `ZoneLink` · `NavChevron` |
| `@repo/web-shared/ui/tokens.css` · `ui/surface.css` | vanilla-extract 토큰(세그먼트 내부 경로 예외) |
| `@repo/web-shared/layout` | zone 루트 레이아웃이 같이 쓰는 것 — `ZoneProviders` · `AppShell`(폭 · 768 미만 안내) · `ProfileMenu` · `NotFoundPage` · `FONT_VARIABLES`(next/font) · `EMBED_SCRIPT` · `rootMetadata` |
| `@repo/web-shared/layout/globals.css` | 전역 스타일 |

- 규칙: `.claude/rules/fsd-shared.md`. 이 패키지는 위 레이어(`@/entities` …) · `domain-*` 를 import 하지 않는다(훅 · lint). 세그먼트끼리는 상대 경로
- `layout` 은 zone 루트 레이아웃의 자리다 — 프레임 · 프로필 메뉴 · 앱 내비게이션 연결(`ZoneNavigation` — 표시는 `@repo/ui` `AppNavigation`) · prerender 규칙 · 문서 간 전환 · 이동 계측(`FE-REQ-054`, 2026-11-03)
