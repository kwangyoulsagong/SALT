/**
 * `app` 레이어의 public API — 앱 초기화만 한다 (`fsd-app.md`).
 *
 * > **루트 `app/` 은 Next 라우팅이고 `src/app/` 은 FSD 초기화다.** 이름이 같으니 매번 확인한다.
 */
export * from "./providers";
export { AppShell } from "./ui/AppShell";
export { store } from "./store";
export type { AppDispatch, RootState } from "./store";
