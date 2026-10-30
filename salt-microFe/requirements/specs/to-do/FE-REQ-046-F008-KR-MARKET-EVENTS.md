---
id: FE-REQ-046
feature: F008
area: frontend
kind: UI
title: "F008 슬라이스 24 — 국내 상세 주요 사건 카드 · 국내 탭 다가오는 일정 띠"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

주요 사건 카드(`FE-REQ-038` FR-13, `entities/coach/ui/EventsCard.tsx`)는 코인 상세(`widgets/symbol-analysis`)에만 있다.
국내 상세(`pages/investment-detail/ui/KrStockDetailBody.tsx`)에도 같은 카드를 붙이고, `/investments` 국내 탭에
다가오는 국내 일정 한 줄을 둔다. 진입점은 `/investments` 다 — 홈에 달지 않는다.

디자인은 착수 전에 기준 증권 앱 스타일을 실측해 맞춘다(일정 리스트 행 · D-day 칩 · 빈 상태). 문서 · 코드에 출처 이름 0건.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 국내 상세에 `EventsCard` — 소유자만(404 면 카드 자체를 그리지 않는다, 코인과 같다). 위치는 국내 판단 카드 아래 |
| FR-2 | 카드 안을 **이 종목 일정**(`scope=symbol`, 2단계) → **시장 일정**(`scope=market`) 순으로. 지역 칩(국내 · 미국). 종류 이름 · 설명은 `shared/i18n` |
| FR-3 | 2단계 — 확정 IR 일정이 없고 `expectedWindow` 가 있으면 "MM.DD ~ MM.DD 사이 공시 예상 · 과거 N회 기준 · 확정 아님". 한 날짜로 그리지 않는다 |
| FR-4 | 과거 반응 상세는 지금 `ReactionDetail` 그대로(분포 · 평소 대비 · 빗나간 때). 막히면 사유 한 줄 |
| FR-5 | `/investments` 국내 탭 지수 띠 아래 "다가오는 일정" 한 줄 — 가장 가까운 3건(날짜 · 종류 · D-day). 분포 없음 → 모든 로그인 사용자. 0건이면 줄을 숨긴다(빈 줄 금지). 503 이면 숨긴다 |
| FR-6 | `FEATURE-006` FR-65 의 "주요 일정은 소스가 생길 때까지 두지 않는다"를 국내 탭에 한해 닫는다 — 보일 종류 · 기간은 서버가 정한다(프론트 상수 0) |
| FR-7 | 로딩은 자리 고정 스켈레톤(가격 깜빡임 · 레이아웃 이동 없음) · reduced-motion |
| FR-8 | 테스트 — 국내 카드 렌더 · 404 숨김 · 예상 창 문구 · 띠 0건 숨김 · i18n 키 누락 0 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
