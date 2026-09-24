---
id: SRV-REQ-037
feature: F008
area: server
kind: API
title: "F008 슬라이스 17a — 가격 변동 범위 API · 소유자 판정 · 원화 환산 · 전망 3종 게이트 (+ 17a-2 해설 검증기 · 템플릿)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/coach/forecast?symbol=BTC` — 기간 4개, 막힌 기간은 사유만 | 완료(17a-1) |
| FR-2 | 소유자(`FORECAST_OWNER_EMAILS`) 아니면 **404** — 존재를 알리지 않는다(ADR-003) | 완료 |
| FR-3 | 로그수익률 분위수 → 가격(기준가 × e^q), 보유 수량 → "이 주에 판다면" 평가금액 변화 범위(원 정수) | 완료 |
| FR-4 | 전망 3종 — 채점 이력 · 기준 대비(폭 · 기준 폭 · pinball) · 빗나간 사례. 하나라도 없으면 범위 없음 | 완료 |
| FR-5 | 방향은 기준을 이긴 기간(`renderable`)에만, 기저율과 한 묶음 | 완료 |
| FR-6 | `forecast.v_forecast_card` **뷰만** `$queryRaw` 로 읽는다 | 완료 |
| FR-7 | 해설 검증기(숫자 대조 · 금지어 · 명령형) · 템플릿 해설 · 기존 규칙 문장 명령형 수정 | 완료(17a-2) |
| FR-8 | SSE 스트림 해설 | 17a-2 이후 |
