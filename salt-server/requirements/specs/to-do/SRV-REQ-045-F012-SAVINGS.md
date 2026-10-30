---
id: SRV-REQ-045
feature: F012
area: server
kind: API
title: "savings 서비스(Kotlin, S1) — 양방향 계산 · 도달 구간 · 저울 · 이정표 · 실물 환산 · 재미 상태"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-012-savings-goals.md
---

## Summary

`modules/goals`(601줄)를 savings 서비스로 옮기고 목표를 계산기로 만든다. **모든 금액 · 날짜 · 구간은 이 서비스가 계산한다** — 프론트 계산 0.

## FR

| FR | 내용 | FEATURE-012 |
|---|---|---|
| FR-1 | 이전 — 기존 `GET/POST /api/goals*` · `POST /api/goals/:id/savings` 골든 JSON 녹화 → Kotlin 구현 → 그림자 비교 → 스위치(`BFF-REQ-045`) | — |
| FR-2 | 템플릿 — 7종 + 기준선(금액 · 출처 · 기준 연도). 원문 대조 전 숫자는 `verified:false` 로 내려 화면이 "미확인" 표시 | FR-1 |
| FR-3 | 양방향 계산 — 금액+기한 → 월 적립액 / 금액+월 적립액 → 도달 월. 세후 이자(15.4%, content 파라미터) 선택 · 기준일. 경계: 기한 지남 · 금액 0 · 이미 달성 | FR-2 |
| FR-4 | 적립 기록 · 나눠 넣기(한 요청 여러 목표, 합계 검증) | FR-3 |
| FR-5 | 도달 구간 — 월별 적립 3개월 이상: 경험 분위수(10~90%) 날짜 구간. 미만: `plan_only` + 이유. 발행할 때마다 `projection_issued` 행 + `savings.ProjectionIssued` | FR-4 |
| FR-6 | 적중 이력 — forecast 커버리지 집계 사본을 목표 응답에 붙인다. 없으면 `reason:"history_short"` | FR-5 |
| FR-7 | 저울 — `POST simulate`: 목표별 월 적립 변경 → 목표별 구간 변화. 저장하지 않음, 300ms | FR-6 |
| FR-8 | 이번 달 이정표 — 넣은 돈 · 계획 · 차이. 문구는 중립 키만(칭찬 · 재촉 · 명령형 0, 금지어 검증기 재사용) | FR-7 |
| FR-9 | 프레임 — 진척 50% 기준 `frame:"saved"\|"remaining"` | FR-8 |
| FR-10 | 오늘 돈 — 공식 물가지수(forecast 수집 사본)로 실질 가치 · 기준일 | FR-9 |
| FR-11 | 놓친 달 회고 — 건너뛴 달 수 · 구간 이동 일수 | FR-10 |
| FR-12 | 비상시 비교 — 목표에서 꺼내기 vs 사용자 입력 금리 대출(이자 합계 · 구간 이동). 상품 · 링크 0 | FR-11 |
| FR-13 | 제도 파라미터 — `content.PolicyParamChanged` 구독 사본으로 계산(청약 인정액 · 기여금). 상품 안내 0 | FR-12 |
| FR-14 | 공동 목표 — 두 사람 초대 · 합의 비율 vs 실제 기여 비율 · 이모지 반응(앱 문구 없음) | FR-13 · 19 |
| FR-15 | 홈 요약 카드 — `HomeSummaryCard`(서버 포맷 문자열) | FR-14 |
| FR-16 | 재미 상태 — 장면 단계(0~N, 서버 계산) · 실물 환산(단위 × 단가, 서버) · 도장 · 엽서 생성(달성 시) | FR-15~18 |
| FR-17 | 구독 — `household.ExpenseRecorded` → 목표 지연 일수 재계산(가계부 응답용 조회 API 제공) · `household.MonthClosed` → 월 저축 속도 갱신 | F013 FR-8 |
| FR-18 | 발행 — `GoalCreated` · `GoalReached` · `ProjectionIssued` | — |
| FR-19 | 성능 — 목록 쿼리 3회 이하 · 저울 300ms · 지연 일수 조회 50ms | NFR |

## API (Swagger)

`GET /api/savings/goals` · `POST /api/savings/goals` · `GET /api/savings/goals/:id` · `POST /api/savings/goals/:id/deposits` · `POST /api/savings/deposits/split` ·
`POST /api/savings/simulate` · `GET /api/savings/goals/:id/delay?amount=` · `GET /api/savings/home-card` · `POST /api/savings/goals/:id/members`

## Acceptance Criteria

- [ ] 기존 goals 경로 골든 JSON 그림자 비교 차이 0 → 스위치
- [ ] 계산 경계 테스트(기한 지남 · 0 · 달성 · 이자 포함/제외)
- [ ] 구간 응답에 적중 이력 또는 `reason` 항상 존재
- [ ] 금지어 검증기 통과(칭찬 · 재촉 · 명령형 0)

## 계약 영향

- DB `DB-REQ-037` · BFF `BFF-REQ-047` · 예측 `FC-REQ-024` · 프론트 `FE-REQ-056` · RN `RN-REQ-033`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
