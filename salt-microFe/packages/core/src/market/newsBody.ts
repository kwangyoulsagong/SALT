/**
 * 기사 본문(`BFF-REQ-053` · `FE-REQ-068`) — BFF 뷰모델 그대로. 문단은 글자만(태그 0 — 화면은 `<p>` 로만 그린다).
 * `ok` 가 아니면 화면은 요약 · 원문 링크(코인) · "본문은 제공처에서"(국내)로 돌아간다
 */
export type ArticleBody =
  | { status: "ok"; paragraphs: string[]; originalUrl: string | null }
  | { status: "not_found" }
  | { status: "unavailable" };

/** 본문을 찾을 기사 — 코인은 원장 id · 국내는 종목 코드 + 원천 일련번호(소유자 경로). 공시는 기사가 아니라 없다 */
export type ArticleBodyRef = { kind: "coin"; id: string } | { kind: "kr"; code: string; serial: string };
