---
id: SRV-REQ-038
feature: F009
area: server
kind: API
title: "F009 코치 — 사이즈 계산 · 거래 계획 · 리스크 예산 (+ 슬라이스 4 · 6 판정 · 미러 · 복기)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md
---

## Summary

FEATURE-009 슬라이스 1 — "이 크기가 내 예산에서 몇 %인가"를 서버 Decimal 로 계산하고, 계획을 저장하고, 예산 게이지 3개를 준다.
**화면은 없다**(슬라이스 3 `BFF-REQ-038` · `FE-REQ-039`). 판정 배치 · 미러 · 복기는 슬라이스 4 · 6 에서 이 REQ 에 FR 을 더한다.

## 결정

1. **`preflight` 와 나란히 새 정책(`sizing.ts`)을 뒀다.** `preflight` 는 금액 입력 · `number` 산술의 특성화 이관 코드이고 테스트가 반올림까지 고정했다. 합치면 그 고정을 깨야 한다
2. **월 손익은 평단 없이 시가 평가로** — 지금 평가 − 월초 평가(지금 수량에서 이번 달 거래를 되감음 × 월초 종가) − 순유입. 월초 보유 종목의 월초 종가가 하나라도 없으면 합을 만들지 않는다(`insufficient_data` + `missingCloses`)
3. **게이지와 사이즈 계산이 같은 스냅샷(`loadRiskSnapshot`)을 읽는다** — 두 화면이 다른 월 잔여를 말하지 않는다
4. **거래에 연결된 계획은 손절가 · 계획 수량 · 오를 확률을 잠근다**(409). 결정 뒤 기준을 옮기면 준수 판정이 자기 채점이 된다. 잠금은 쓰기 문장의 조건(`transaction_id IS NULL`)이라 검사 · 쓰기 사이 경합이 뚫지 못한다
5. **실현 변동성은 `forecast.v_realized_vol` 에서** (슬라이스 2) — 막힌 행 · 3일 넘은 행은 `null` → `insufficient_data`. 0 이 아니다. 슬라이스 1 에선 원천이 없어 늘 `null` 이었다
6. **응답 비율 이름은 `*Rate`(소수, 0.28 = 28%)** — 기획서 초안의 `*Pct` 대신 기존 계약(`maxLossOfTotalRate`)과 같은 규칙

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `POST /api/coach/size-check` `{symbol, side, quantity, price, stopPrice?, winRate?, payoffRatio?}` — 최대 손실(원) · 단위 손실 · 1회 예산 대비 · 월 잔여 대비 · 참고 수량 상한(`limitedBy`) · 변동성 타깃 비중 · 현재/거래 후 비중 · 5연속 손절 · 켈리(풀 · ½ · ¼, `hasEdge`) · `unavailable` 사유 · `assumptions` · `orderExecution: false` (FEATURE-009 FR-4~8) | 완료(슬라이스 1) |
| FR-2 | 최대 손실 = 수량 × ((진입 − 손절) + (진입 + 손절) × 0.05%). 갭 가정 없음을 응답에 밝힌다. 손절 ≥ 진입이면 `stop_not_below_entry` | 완료 |
| FR-3 | 참고 수량 상한 = min(1회 예산 ÷ 단위 손실, 한 종목 상한 수량). 가용 현금은 모른다(현금 기록 없음) — 식에서 뺐다 | 완료 |
| FR-4 | 못 구한 값은 `null` + `unavailable.<필드>` 사유(`stop_price_missing` · `stop_not_below_entry` · `budget_not_set` · `no_portfolio_value` · `monthly_budget_exhausted` · `insufficient_data` · `not_applicable_sell`). 0 · 기본값 채움 0건 | 완료 |
| FR-5 | `GET · PUT /api/coach/risk-budget` — 예산 설정(원 · 비율, `null` 은 지움) · 게이지: 이번 달 낙폭(KST 월) · 종목 집중도 · 최근 365일 회전율 · 올해 수수료. 넘어도 막지 않는다(`exceeded`) (FEATURE-009 FR-1~3 · 17 · 23 · 24) | 완료 |
| FR-6 | `POST · GET /api/coach/plans` · `PATCH /api/coach/plans/:id` — 종목 · 방향 외 전부 선택. 거래 연결은 본인 · 같은 종목 · 같은 방향 · 한 번. 연결 뒤 채점 기준 잠금(409). 삭제 없음 (FEATURE-009 FR-9~10) | 완료 |
| FR-7 | `PATCH /api/ai-coach/profile` 에 `hidePurchasePrice`. 프로필 응답에서 예산 3필드는 뺀다(`/coach/risk-budget` 이 준다) (FEATURE-009 FR-27 저장) | 완료 |
| FR-8 | 금액 · 비율은 도메인에서 `Money` · `Decimal`, 원 반올림은 응답 변환(`presentation/dto/riskView`) 한 곳 | 완료 |
| FR-9 | 준수 판정 배치 · `DecisionOutcome` 생성 · 자동 태그 · `mirror.ts` · `GET /coach/mirror` (FEATURE-009 FR-11~22) | to-do(슬라이스 4) |
| FR-10 | 월간 복기 · Brier · 체크리스트 · 코치 대화 3문항 · 시나리오 (FEATURE-009 FR-13 · 25 · 28~31) | to-do(슬라이스 6) |
| FR-11 | 실현 변동성 읽기 — `ForecastReader.realizedVolatility` 를 `forecast.v_realized_vol` 로(`KRW-` 접두 · `annualized` null 또는 `as_of` 3일 초과면 `null`) | 완료(슬라이스 2) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-24 | 신설 · 슬라이스 1 FR-1~8 구현. 근거 `reports/checklists/SRV-REQ-038.md` |
| 2026-09-24 | 슬라이스 2 FR-11 — 실현 변동성 읽기(`FC-REQ-006`). 메서드 하나 · 응답 계약 변경 없음 |
