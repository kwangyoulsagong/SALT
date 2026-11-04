---
id: DB-REQ-038
feature: F013
area: db
kind: SCHEMA
title: "가계부 — household 스키마(거래 · 봉투 예산 · 반복 템플릿 · 할부 · 태그 · 월 마감 · 사람 장부 · 챌린지)"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-013-household-budget.md
---

## Summary

신규 도메인. 처음부터 Flyway(서버 S1). **결제 문자 원문을 저장하는 열은 만들지 않는다.**

## FR

| FR | 내용 | FEATURE-013 |
|---|---|---|
| FR-1 | `expense` — `user_id` · `amount NUMERIC` · `spent_at` · `category_id` · `payment_method`(카드 · 현금 · 이체 · 기타 — 카드사 · 번호 없음) · `merchant` · `precision`(`exact` · `approx`) · `input_kind`(quick · line · paste · template · approx) · `installment_id` · `memo` | FR-1~5 |
| FR-2 | `category` — 기본 분류 + 사용자 분류 · `bucket`(needs · wants · savings — 50/30/20) | FR-6 |
| FR-3 | `budget_envelope` — 월 · 분류 묶음 · 금액 · 방식(`50_30_20` · `envelope` · `account_split` 라벨). 초과 상태 열 없음(계산값) | FR-6 |
| FR-4 | `recurring_template` — 이름 · 금액 · 주기 · 다음 예정일 · `confirm_required`. `recurring_occurrence` — 예정 행 · 확인 여부 | FR-4 |
| FR-5 | `installment` — 원거래 금액 · 개월 수 · 시작 월 · 리볼빙 여부. 월 청구는 계산(저장 안 함) | FR-10 |
| FR-6 | `expense_tag` — 감정 태그 · 다음 날 만족도(1~5). **민감 정보 분류 표시**(`FEATURE-015` FR-5) | FR-13 |
| FR-7 | `month_close` — 월 · 리뷰 3문항 답(텍스트) · 닫은 시각. 평가 점수 열 없음 | FR-9 |
| FR-8 | `landing_issued` — 월 · 발행일 · `p_low` · `p_high` · 방법. 불변 — 다음 달 같은 날짜 적중 판정 근거 | FR-7 |
| FR-9 | `person_ledger` — 상대 이름(사용자 입력) · 주고받음 · 금액 · 행사 · 날짜. 민감 정보 분류 | FR-14 |
| FR-10 | `challenge` — 사용자가 고른 이름 · 기간 · 상태(`active` · `ended`) — **실패 상태 없음**. `challenge_saving` — 아낀 돈 기록(목표에 보탤 때 savings `deposit.source=saved_by_challenge`) | FR-19 |
| FR-11 | `calendar_sticker` — 날짜 · 종류(무지출 · 챌린지). 연속 일수 열 없음 | FR-16 · 20 |
| FR-12 | 인덱스 — `expense(user_id, spent_at)` · `expense(user_id, category_id, spent_at)` · `recurring_occurrence(due_on)` | 성능 |
| FR-13 | 원문 금지 검사 — 스키마 테스트가 `raw` · `sms` · `message_text` 같은 열 이름 0 을 확인 | FR-3 |

## Acceptance Criteria

- [x] 결제 문자 원문 열 0(스키마 테스트)
- [ ] `challenge` 상태 값에 실패 없음
- [x] `landing_issued` UPDATE · DELETE 실패

## 계약 영향

- 서버 `SRV-REQ-046` · 예측 `FC-REQ-024`

## 구현 현황 — 가계부 S1a (2026-11-04, `requirements/specs/done/MONEY-S1-household-entry-slice.md`)

Flyway `services/household/infrastructure/src/main/resources/db/migration/household/V1__baseline.sql`(로컬 운영 DB 적용 2026-11-04 — `svc_household` 로그인).

| FR | 상태 | 비고 |
|---|---|---|
| FR-1 | done — `expense`. 날짜는 `spent_on date`(KST 달력 — 저축 `deposited_on` 과 같은 뜻, 스펙의 `spent_at` 대신). `installment_id` 대신 `installment_months`(판단 4) | 분류 키에 CHECK 없음(판단 6) |
| FR-3 | done — `budget`(사용자당 "지금 예산" 하나, 판단 3) + `budget_envelope`. 초과 상태 열 0 | 스펙의 "월" 열 대신 지금 예산 — 달별 이력은 S1b 월 마감과 같이 |
| FR-8 | done — `landing_issued` 불변 트리거 · `(user_id, month, issued_on)` 유일(하루 한 번) | |
| FR-12 | done — `expense(user_id, spent_on)` · `(user_id, category, spent_on)` · 가맹점 부분 인덱스. `recurring_occurrence` 는 S1b | |
| FR-13 | done — 원문 열 0(종단 테스트가 `information_schema` 로 열 이름 검사) | |
| FR-2 · 4 · 5 · 6 · 7 · 9 · 10 · 11 | S1b | 슬라이스 범위 밖 |

생성기(H2 흉내)가 text 열의 키 · 유일 제약을 못 읽어 `ALTER TABLE` 로 빼고 `[jooq ignore]` 로 감쌌다(`kotlin-platform.md` §4 와 같은 처리).

## 구현 현황 — 가계부 S1b (2026-11-04, `requirements/specs/done/MONEY-S1b-household-month-slice.md`)

Flyway `V2__recurring_close.sql`(로컬 운영 DB 적용 2026-11-04).

| FR | 상태 | 비고 |
|---|---|---|
| FR-4 | done — `recurring_template`(주기 열 없이 매달 · `starts_month` · 끝내도 행은 남김 `ended_at`) · `recurring_occurrence`(`(template_id, month)` 유일 · 확인하면 `expense_id` · CHECK 둘: 확인 ⇔ 지출 있음, 예정 ⇔ 정한 시각 없음). 스펙의 "다음 예정일" 열 대신 날짜 규칙으로 계산 | FK `expense_id` 는 막음 — 지우기 유스케이스가 먼저 되돌린다 |
| FR-7 | done — `month_close`(답 3열 300자 · 평가 점수 열 없음 · `(user, month)` 유일) + `month_close_envelope`(닫을 때 예산 사본) | S1a 판단 3 의 달별 이력 |
| FR-8 | `landing_issued.scheduled`(기본 0 — 예정 개념 전 발행은 0) | 불변 트리거 그대로 |
| FR-12 | done — `recurring_occurrence (user_id, month)` · 예정 부분 인덱스 `(due_on) WHERE status='scheduled'` · `expense (user_id, spent_on) WHERE installment_months IS NOT NULL` | 스펙의 `recurring_occurrence(due_on)` 대신 사용자 · 달 |
| FR-2 · 5 · 6 · 9 · 10 · 11 | S1c · 뒤 | 리볼빙 표(FR-5)는 S1c |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-04 | 가계부 S1a — in-progress. V1(`63146ddf`) · FR-1 · 3 · 8 · 12 · 13. 수용 기준 1 · 3 충족(2 `challenge` 는 S1b) |
| 2026-11-04 | 리뷰 반영 `85512af5` — 스키마 변경 0(착지 계산 · 원 단위 검사는 서비스). `landing_issued.spent_so_far` 의 뜻이 "그날 시작 시점 합"으로 |
| 2026-11-04 | EXPLAIN 확인(행 2만 넣고 롤백 — 다섯 쿼리 인덱스 · 1ms 미만) |
| 2026-11-04 | 가계부 S1b — V2(`a32d349e`) · FR-4 · 7 · 12 done · `landing_issued.scheduled`. EXPLAIN 확인(행 넣고 롤백) |
