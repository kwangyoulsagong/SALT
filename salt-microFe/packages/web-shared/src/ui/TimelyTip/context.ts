/**
 * 때맞춘 팁 화면 맥락 — 서버 `GET /api/content/me/tip?context=` 의 세 값(도메인 zone 이름과 같다, `ADR-005`).
 *
 * **`"use client"` 파일 밖에 둔다** — 서버 컴포넌트(저축 · 가계부 페이지)가 값을 읽는다. 클라이언트 모듈의 enum 은 서버에서
 * 클라이언트 참조가 돼 `TimelyTipContext.Savings` 가 `undefined` 였다(2026-11-05 실화면 — 요청이 `context=undefined` 로 나가 400).
 */
export enum TimelyTipContext {
  Home = "home",
  Savings = "savings",
  Household = "household",
}
