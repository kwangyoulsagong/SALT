/**
 * `app` 레이어의 public API — 앱 초기화만 한다 (`fsd-app.md`).
 *
 * > **루트 `app/` 은 Next 라우팅이고 `src/app/` 은 FSD 초기화다.** 이름이 같으니 매번 확인한다.
 */
export * from "./providers";
// 프레임 · 앱 웹뷰 표지는 zone 이 같이 쓴다 — `@repo/web-shared/chrome`(FE-REQ-053). 라우팅 파일이 `@/app` 만 보도록 여기서 다시 연다
export { AppShell, EMBED_SCRIPT, NotFoundPage, notFoundMetadata } from "@repo/web-shared/chrome";
export { store } from "./store";
export type { AppDispatch, RootState } from "./store";
