/**
 * 앱 웹뷰 계약(`FE-REQ-043` FR-6) — 앱이 화면을 웹뷰로 띄울 때 User-Agent 끝에 이 표시를 붙인다.
 * **2026-11-20 `ADR-012` — 앱(RN)은 폐기.** 이 계약과 그 위의 휴대폰 배치는 PWA `/m` zone 으로 옮긴 뒤 지운다(`ADR-012`).
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

/**
 * vanilla-extract `selectors` 키 — 앱 웹뷰에서만 바꾸는 값(F017 v4 순서 6 · `ADR-012` 로 PWA `/m` 에 옮김: 글자 13 이상 · 탭 44 이상).
 * `{ fontSize: "12px", selectors: { [IN_APP_WEBVIEW]: { fontSize: "13px" } } }` — 데스크톱 웹 값은 그대로 둔다(`screen-desktop.md` 라벨 12)
 */
export const IN_APP_WEBVIEW = `html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] &`;
