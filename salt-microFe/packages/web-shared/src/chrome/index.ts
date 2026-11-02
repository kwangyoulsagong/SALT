/**
 * 앱 크롬 — 모든 zone 의 루트 레이아웃이 같이 쓰는 프레임 (`FE-REQ-053`).
 *
 * 화면이 아니라 껍데기다: 프로바이더 · 폭 프레임 + 768 미만 안내 · 헤더 프로필 · 앱 웹뷰 표지 · 기본 메타데이터.
 * 셸 `src/app` 에 있던 것을 zone 이 갈리면서 여기로 올렸다. `FE-REQ-054` 가 `@repo/ui` `AppChrome`(하단 탭 · 헤더)을
 * 만들면 프레임 · 프로필은 그쪽으로 옮기고 이 자리는 줄어든다.
 *
 * 전역 스타일은 `@repo/web-shared/chrome/globals.css` 로 따로 연다 — `.css.ts` 를 barrel 로 묶지 않는다.
 */
export { AppShell } from "./AppShell";
export { EMBED_SCRIPT } from "./embed";
export { NotFoundPage, notFoundMetadata } from "./NotFoundPage";
export { ProfileMenu } from "./ProfileMenu";
export { rootMetadata } from "./rootMetadata";
export { ZoneProviders } from "./ZoneProviders";
