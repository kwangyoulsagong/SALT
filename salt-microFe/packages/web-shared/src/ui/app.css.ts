import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";

/**
 * 앱 웹뷰 배치 전환(`FE-REQ-060` FR-M) — 데스크톱 · 앱 두 배치를 **같은 HTML 에 두고 CSS 로 고른다**.
 * 웹뷰 판정은 `<head>` 첫 스크립트가 다는 `<html data-embed="app">` 이라 첫 페인트 전에 맞고, 서버 HTML 이 같아 수화가 갈리지 않는다.
 * 마운트 여부를 갈라야 할 때만(시트 · 다른 세그먼트) `useInAppWebview`
 */
export const deskOnly = style({ selectors: { [IN_APP_WEBVIEW]: { display: "none" } } });
export const appOnly = style({ display: "none", selectors: { [IN_APP_WEBVIEW]: { display: "revert" } } });
