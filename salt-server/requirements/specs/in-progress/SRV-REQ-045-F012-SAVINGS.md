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

## 진행 — S1a (2026-11-03, 슬라이스 `requirements/specs/in-progress/MONEY-S1a-savings-calculator-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 | **정정 2026-11-03** — ~~골든 녹화 → Kotlin 구현 → 그림자 → 스위치~~ 옛 `/api/goals*` 는 다시 만들지 않고 **은퇴**(BFF 410). 데이터는 관리자 SQL 로 가져오기(`salt-platform/db/savings-import.sql`), 소비처 셋(셸 화면 · 홈 카드 · 온보딩 프로브)을 같은 슬라이스에서 옮겼다 — 쓰기 경로가 둘인 기간 0. 옛 Express 코드 삭제는 1주 관찰 뒤 | `e83f7f80` · `1ec3b0c6` · `3e5e0d42` |
| FR-2 | 부분 — 템플릿 7종. 기준선은 원문 대조 전이라 **금액을 내리지 않는다**(`baseline: null` + `baselineReason: unverified_source`) | `ListTemplates` |
| FR-3 | done — 기한 → 월 적립(원 단위 올림) · 월 적립 → 도달 월 · 세후 단리(15.4% 상수, FR-13 사본 전) · 경계(기한 이번 달 · 지남 · 0 · 달성 · 100년) + 저장 없는 `POST /api/savings/calculate`(스펙 API 목록 밖 — 만들기 화면 디바운스 자리) | `SavingsMath` · `Calculate` |
| FR-4 | done — 단건 · 나눠 넣기(합계 = 나눈 합, 같은 목표 두 번 거부, 2개 이상) · 목표 행 잠금(id 순) | `RecordDeposits` |
| FR-5 | done — 다 찬 달 3개월 이상: 월 적립 10 · 90% 분위 → 늦은 · 빠른 끝(빈 달 0 · 이번 달 제외 · 가져온 잔액 제외), 미만 `plan_only` + 이유. 만들기 · 적립 때만 `projection_issued` + `savings.ProjectionIssued` | `ProjectionEngine` · `ProjectionIssuer` |
| FR-6 | 부분 — 채점 사본 없음 → `track: null` + `trackReason: history_short` 늘 | `FC-REQ-024` 뒤 |
| FR-8 | done — 이번 달 넣은 돈 · 계획 · 차이 · 상태 키(`no_plan` · `under_plan` · `plan_met`). 서버 문장 0(키만) | `Milestone` |
| FR-9 | done — `frame` saved/remaining(50%) | `Frame` |
| FR-15 | done — `GET /api/savings/home-card` 숫자(목표 수 · 진행 중 · 모은 돈 · 진척 최대 진행 중 목표). 포맷은 BFF 카드 계약 | `HomeCard` |
| FR-18 | 부분 — `GoalCreated` · `GoalReached`(목표마다 한 번) · `ProjectionIssued` 계약 3 + 발행. 구독자 없음(S2 · `FC-REQ-024`) | `contracts/events/savings.*` |
| FR-19 | done — 목록 쿼리 3회(테스트가 jOOQ 리스너로 센다) | `SavingsEndToEndTest` |
| FR-7 · 10~14 · 16 · 17 | S1b · 뒤 — 저울 · 오늘 돈 · 놓친 달 · 비상시 · 제도 파라미터 · 공동 목표 · 재미 상태 · 가계부 구독 | 루트 슬라이스 범위 밖 |

## Acceptance Criteria

- [x] ~~기존 goals 경로 골든 JSON 그림자 비교 차이 0 → 스위치~~ **정정 2026-11-03**: 옛 경로 은퇴 + 가져오기 대조(행 수 · 적립 합) — FR-1 행
- [x] 계산 경계 테스트(기한 지남 · 0 · 달성 · 이자 포함/제외) — `SavingsMathSpec` 10
- [x] 구간 응답에 적중 이력 또는 `reason` 항상 존재 — `trackReason`
- [x] 금지어 검증기 통과(칭찬 · 재촉 · 명령형 0) — 서버는 문장 0(상태 키만). 화면 문구 금지어 grep 0(`FE-REQ-056`)

## 계약 영향

- DB `DB-REQ-037` · BFF `BFF-REQ-047` · 예측 `FC-REQ-024` · 프론트 `FE-REQ-056` · RN `RN-REQ-033`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | **in-progress** — S1a(`e83f7f80` Kotlin `savings` 첫 판 · `1ec3b0c6` 온보딩 프로브 · `b1c8ad67` `progressRatio` · `8d05a006` 상시 실행). FR-1 정정(은퇴 + 가져오기) · FR-3 · 4 · 5 · 8 · 9 · 15 · 19 done, FR-2 · 6 · 18 부분. 수용 기준 4/4 |
| 2026-11-03 | FR-5 보강 `2c998117` — 구간 계산 실패는 그 칸만 `degraded` + 계획대로면 X월(발행하지 않음). 도메인 테스트 +2 |
| 2026-11-03 | 코드 리뷰 10건 중 9건(①~⑨) `c82be47c`. FR-5 정정: ~~발행 기록을 화면이 읽는다~~ 조회는 늘 지금 기준 재계산 · 응답 `projection.issuedAt` 제거. 경로 하나 추가 `GET /api/savings/goals/exists` |
| 2026-11-03 | MONEY-S1a — `c60f5bfb` — 웹 만들기 · 적립 요청 타입이 서버 DTO 이름을 따른다. 서버 무변경 |
