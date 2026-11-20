/**
 * 휴대폰 PWA `/m` 틀(`FE-REQ-071`, `ADR-012`) — 입구 `@repo/web-shared/layout/mobile` 하나.
 * 공용 레이아웃 배럴(`layout`)에 두지 않는다 — 데스크톱 zone 다섯의 레이아웃 번들에 휴대폰 코드가 딸려 가지 않게.
 */
export { MobileShell } from "./MobileShell";
export { MobileLoginPage } from "./MobileLoginPage";
export { MobilePendingPage } from "./MobilePendingPage";
export { RegisterServiceWorker } from "./RegisterServiceWorker";
export { MOBILE_TABS, activeMobileTab, mobileTabHref } from "./mobileTabs";
export {
  MOBILE_ICONS,
  desktopViewResponse,
  manifestResponse,
  mobileManifest,
  mobileMetadata,
  mobileViewport,
  offlineHtml,
  offlineResponse,
  serviceWorkerResponse,
  serviceWorkerSource,
} from "./routes";
