/**
 * 공용 레이아웃 — 모든 zone 의 루트 레이아웃이 같이 쓰는 프레임 (`FE-REQ-053`).
 *
 * 화면이 아니라 껍데기다: 프로바이더 · 폭 프레임 + 앱 내비게이션 + 768 미만 안내 · 머리 프로필 · 앱 웹뷰 표지 · 문서 간 전환 · 기본 메타데이터.
 * 셸 `src/app` 에 있던 것을 zone 이 갈리면서 여기로 올렸다. 탭 · 머리는 `@repo/ui` `AppNavigation`(`FE-REQ-054`, ADR 의 옛 이름
 * `AppChrome`)이고, `AppShell` 이 그것에 레지스트리 판정(`ZoneNavigation`) · prerender 규칙 · 계측을 입힌다.
 *
 * 전역 스타일은 `@repo/web-shared/layout/globals.css` 로 따로 연다 — `.css.ts` 를 barrel 로 묶지 않는다.
 */
export { AppShell } from "./AppShell";
export { EMBED_SCRIPT } from "./embed";
export { FONT_VARIABLES } from "./fonts";
export { NotFoundPage, notFoundMetadata } from "./NotFoundPage";
export { ProfileMenu } from "./ProfileMenu";
export { PublicShell } from "./PublicShell";
export { rootMetadata } from "./rootMetadata";
export { VIEW_TRANSITION_CSS } from "./viewTransition";
export { ZoneProviders } from "./ZoneProviders";
