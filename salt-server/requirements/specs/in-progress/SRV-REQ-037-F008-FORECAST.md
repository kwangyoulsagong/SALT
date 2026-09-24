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
| FR-7a | **숫자 대조를 값 · 단위 · 방향으로**(개정 2026-09-24, F009 슬라이스 0 C03). 원 · 억 · 만은 원으로 환산해 맞춘다. 1~12 는 세는 말(가지 · 개 · 차 …)이 붙을 때만 허용. 방향이 둘 다 있고 다르면 다른 사실. "~해서 · 때문에 · 영향으로" 인과 문장은 사실과 맞은 숫자가 없으면 버린다(`unsupported_causal` → 템플릿). **지표 이름(metricId)은 C01 뒤** — 근거가 자유 문자열이라 구조로 알 수 없다 | 완료(2026-09-24, 지표 이름 제외) |
| FR-10 | `GET /api/coach/events?symbol=` — 주요 사건 · 과거 반응(소유자 404). 3종(표본 · 분포와 평소 분포 · 빗나간 때) 중 하나라도 없으면 분포 없이 사유만. 호재 · 악재 필드 없음 | 완료(2026-09-24) |
| FR-9 | 응답에 `history` — 전망이 쓴 것과 **같은** 일봉(업비트 1d) 최근 56개, `forecast.v_daily_close` 뷰로 읽는다 | 완료 |
| FR-8 | SSE 스트림 해설 `POST /api/ai-coach/explain/stream` — 템플릿 먼저 흘리고(delta), 같은 시각 출발한 LLM 이 검증을 통과하면 `replace`. 단계 이벤트는 실제 작업 경계에서만. LLM 원문은 흐르지 않는다. 15초 ping · 끊기면 LLM 까지 중단 · 한도는 단건과 공유 | 완료(2026-09-24) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-24 | **F009 슬라이스 0 — C03.** FR-7a 신설 · 구현. 근거 `reports/checklists/SRV-REQ-037.md` C03 절 |
