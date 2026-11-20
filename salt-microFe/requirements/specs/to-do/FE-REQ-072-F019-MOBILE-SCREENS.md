---
id: FE-REQ-072
feature: F019
area: frontend
kind: UI
title: "휴대폰 화면 옮기기 — 웹뷰 배치(홈 · 저축 · 가계부 · 투자 상세)를 /m 으로 · 앱 웹뷰 계약 걷기"
priority: high
created: 2026-11-20
source: 사용자 "웹뷰 배치를 PWA로 전환" · ADR-012
---

## Summary

`ADR-012` 순서 2. `FE-REQ-060` FR-M(앱 웹뷰 휴대폰 배치 — 같은 HTML 에 CSS 로)과 F017 v4 순서 6 웹뷰 몫(옛 `RN-REQ-032` FR-7 · 8 · 10)을 **도메인 패키지 `mobile` 진입점**으로 옮긴다. 데스크톱 화면에서 휴대폰 분기가 사라진다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `@repo/domain-savings/mobile/*` · `domain-household` · `domain-invest` 진입점(`src/mobile/<page>` — pages 형제, 자기 entities · features · widgets 재사용) · 홈은 셸 `entities/home` 을 패키지로 옮기거나 BFF 카드 계약으로 `/m/home` |
| FR-2 | 옮길 배치 — 홈 목록 행 + 시작하기 배너 · 저축 목록 → 상세 push · "넣기" 하단 버튼 → 시트 · 가계부 세그먼트 넷 · "지출 적기" → 시트 · 주인공 숫자 30(`appType`) |
| FR-3 | 투자 — `/m/investments/[symbol]` 한 장 패널 한 열 · 스트림 복귀(옛 `RN-REQ-032` FR-8 웹 몫) · `/m/coach/report` |
| FR-4 | 걷기 — `SALTApp/` UA · `EMBED_SCRIPT` · `data-embed` · `IN_APP_WEBVIEW` · `useInAppWebview` · 데스크톱 화면의 `deskOnly` 분기. `appType` 토큰은 모바일 zone 전용 단으로(래칫 시험 대상 이동) |
| FR-5 | `screen-mobile.md` 값(터치 44 · 글자 13 이상 · 글자 ×2 넘침 0)을 `/m` 실측으로 다시 |

## 검증

- 390 · 360 휴대폰 실측(웹뷰 UA 가 아니라 휴대폰 브라우저 UA) · 데스크톱 화면 배치 변화 0 · 데스크톱 첫 로드 번들 감소 측정
- `grep -r "IN_APP_WEBVIEW\|SALTApp\|data-embed"` 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규(to-do) — `ADR-012` 순서 2 |
