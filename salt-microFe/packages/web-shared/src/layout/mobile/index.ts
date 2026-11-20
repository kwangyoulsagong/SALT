/**
 * 휴대폰 PWA `/m` 틀(`FE-REQ-071`, `ADR-012`) — 입구 `@repo/web-shared/layout/mobile` 하나.
 * 공용 레이아웃 배럴(`layout`)에 두지 않는다 — 데스크톱 zone 다섯의 레이아웃 번들에 휴대폰 코드가 딸려 가지 않게.
 * **클라이언트 잎도 이 배럴을 읽는다** — 서버 전용(`next/headers`) 홈 화면은 따로 `@repo/web-shared/layout/mobile/home`(`FE-REQ-072`).
 */
export { MobileShell } from "./MobileShell";
export { MobileLoginPage } from "./MobileLoginPage";
export { MobileHead, MobileScreen, MobileSection } from "./MobileScreen";
export { MobileSummary, type MobileSummaryProps } from "./MobileSummary";
export { MobileSheetAction, type MobileSheetActionProps } from "./MobileSheetAction";
export { DesktopViewLink } from "./DesktopViewLink";
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
