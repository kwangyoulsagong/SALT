/**
 * 앱 웹뷰 계약(`FE-REQ-043` FR-6) — RN 앱(`apps/mobile`)이 정보가 많은 화면을 웹뷰로 띄울 때
 * User-Agent 끝에 이 표시를 붙인다(react-native-webview `applicationNameForUserAgent`).
 * 웹은 이 표시가 있으면 좁은 화면 안내를 끄고 페이지를 그대로 보인다.
 *
 * 웹과 앱이 **같은 문자열**을 봐야 해서 플랫폼 무관 패키지에 둔다. 바꾸면 이미 깔린 앱 버전이 안내에 막힌다 —
 * 새 값을 더하고 옛 값을 한동안 같이 받는다.
 */
export const APP_WEBVIEW_UA_TOKEN = "SALTApp";

/** User-Agent 가 앱 웹뷰인가. `SALTApp/1.2.0` 처럼 뒤에 버전이 붙는다 */
export const isAppWebView = (userAgent: string): boolean =>
  new RegExp(`(^|\\s)${APP_WEBVIEW_UA_TOKEN}/`).test(userAgent);

/** `<html>` 에 다는 속성 — CSS 가 이것으로 안내를 끈다 */
export const EMBED_ATTRIBUTE = "data-embed";
export const EMBED_APP = "app";
