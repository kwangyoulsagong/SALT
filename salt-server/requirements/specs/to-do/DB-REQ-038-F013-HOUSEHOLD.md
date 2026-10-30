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

- [ ] 결제 문자 원문 열 0(스키마 테스트)
- [ ] `challenge` 상태 값에 실패 없음
- [ ] `landing_issued` UPDATE · DELETE 실패

## 계약 영향

- 서버 `SRV-REQ-046` · 예측 `FC-REQ-024`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
