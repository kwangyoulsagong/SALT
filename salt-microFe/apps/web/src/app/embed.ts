import { APP_WEBVIEW_UA_TOKEN, EMBED_APP, EMBED_ATTRIBUTE } from "@repo/core/embed";

/**
 * 첫 페인트 전에 `<html data-embed="app">` 을 단다 — 앱 웹뷰면 좁은 화면 안내를 끈다(`FE-REQ-043` FR-6).
 *
 * 서버에서 User-Agent 를 읽으면 루트 레이아웃이 동적 렌더가 되어 모든 페이지가 정적 최적화를 잃는다.
 * 그래서 `<head>` 의 인라인 스크립트 한 줄로 브라우저가 판단한다 — CSS 보다 먼저 돌아 깜빡임이 없다.
 * `<html>` 속성이 서버 HTML 과 달라지므로 레이아웃의 `<html>` 에 `suppressHydrationWarning` 을 둔다.
 */
export const EMBED_SCRIPT = `(function(){try{if(/(^|\\s)${APP_WEBVIEW_UA_TOKEN}\\//.test(navigator.userAgent)){document.documentElement.setAttribute("${EMBED_ATTRIBUTE}","${EMBED_APP}")}}catch(e){}})();`;
