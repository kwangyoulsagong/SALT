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

> **2026-11-02 1단계 구현** — FR-1 · 3 · 4, FR-2 는 `scope` · `region` 까지(`expectedWindow` 는 서버 2단계 `SRV-REQ-041` FR-4 뒤). 검증 `checklists/BFF-REQ-043.md`.

## Summary

주요 사건 뷰모델(`BFF-REQ-037`, `app-forecast.service.ts`)에 서버가 새로 주는 `scope` · `region` · `expectedWindow` 를 싣고,
다가오는 국내 일정 경로를 하나 연다. 판정 · 계산을 하지 않는다 — 서버 숫자를 모양만 바꾼다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/coach/events?symbol=` 이 국내 종목 코드를 그대로 넘긴다. 404(소유자 아님)는 그대로 404 |
| FR-2 | 뷰모델에 `scope` · `region` · `expectedWindow` 를 그대로. 종류 코드(`kr_bok_rate` 등)는 문장으로 바꾸지 않는다(프론트 i18n). **2026-11-02**: `scope` · `region` 완료(옛 서버 응답엔 없으니 `market` · `us` 로 읽는다) — `expectedWindow` 는 2단계 |
| FR-3 | 신규 `GET /api/app/market/kr/schedule?days=` → 서버 `GET /api/market/kr/schedule`. 503 은 그대로(프론트가 "일정 불러올 수 없음"으로) |
| FR-4 | 테스트 — 국내 행 · 시장/종목 범위 · 창 있음/없음 · 503 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 1단계 구현 · in-progress. `/schedule` 은 `/:code` 앞(라우터 순서가 계약). 일정 뷰모델은 모르는 종류 · 깨진 행을 버린다. 캐시 없음(국내 경로 규칙 그대로) |
| 2026-11-02 | 국내 탭 요약 띠(`feat/kr-market-summary`, 루트 `F011-kr-market-summary-slice.md`): **변경 없음**(짝 영역) — 웹은 이제 `/schedule` 을 부르지 않는다(일정 3건은 요약 응답 `schedule` 안, `FE-REQ-046` FR-5 정정). 경로는 남긴다 — 공개 일정이라 앱 · 다른 화면이 쓸 수 있다 |
