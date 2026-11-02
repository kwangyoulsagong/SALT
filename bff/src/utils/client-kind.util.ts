/**
 * 요청 클라이언트 — 해설 다듬기 공급자 라우팅용(`BFF-REQ-050` FR-1 · `SRV-REQ-050` FR-4).
 *
 * 앱 웹뷰는 UA 끝에 `SALTApp/<버전>` 을 붙인다 — 화면 쪽 계약 `@repo/core/embed` `isAppWebView` 와 **같은 규칙**이다
 * (BFF 는 `@repo/core` 를 import 하지 않는다 — 정규식 하나라 옮겨 적는다. 바꾸면 둘 다).
 * 서버로는 BFF 가 정한 값만 보낸다 — 클라이언트가 보낸 `X-Salt-Client` 는 쓰지 않는다(사용자가 공급자를 고르지 못하게).
 */
export type ExplainClient = "web" | "mobile";

export const SALT_CLIENT_HEADER = "X-Salt-Client";

const APP_WEBVIEW = /(^|\s)SALTApp\//;

export const explainClientOf = (userAgent: string | undefined): ExplainClient =>
  userAgent && APP_WEBVIEW.test(userAgent) ? "mobile" : "web";
