---
id: BFF-REQ-043
feature: F008
area: bff
kind: API
title: "F008 슬라이스 24 — 국내 주요 사건 · 다가오는 국내 일정 중계"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

주요 사건 뷰모델(`BFF-REQ-037`, `app-forecast.service.ts`)에 서버가 새로 주는 `scope` · `region` · `expectedWindow` 를 싣고,
다가오는 국내 일정 경로를 하나 연다. 판정 · 계산을 하지 않는다 — 서버 숫자를 모양만 바꾼다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/coach/events?symbol=` 이 국내 종목 코드를 그대로 넘긴다. 404(소유자 아님)는 그대로 404 |
| FR-2 | 뷰모델에 `scope` · `region` · `expectedWindow` 를 그대로. 종류 코드(`kr_bok_rate` 등)는 문장으로 바꾸지 않는다(프론트 i18n) |
| FR-3 | 신규 `GET /api/app/market/kr/schedule?days=` → 서버 `GET /api/market/kr/schedule`. 503 은 그대로(프론트가 "일정 불러올 수 없음"으로) |
| FR-4 | 테스트 — 국내 행 · 시장/종목 범위 · 창 있음/없음 · 503 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
