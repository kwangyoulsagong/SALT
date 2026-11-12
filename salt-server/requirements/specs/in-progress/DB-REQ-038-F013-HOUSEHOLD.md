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
| FR-2 | `category` — 기본 분류 + 사용자 분류 · `bucket`(needs · wants · savings — 50/30/20) — **정정 2026-11-05** 기본 분류는 코드 표(묶음 needs · wants — savings 는 저축 서비스 몫), 사용자 분류는 FR-17 `custom_category`(S1f) | FR-6 |
| FR-3 | `budget_envelope` — 월 · 분류 묶음 · 금액 · 방식(`50_30_20` · `envelope` · `account_split` 라벨). 초과 상태 열 없음(계산값) — **`account_split` done 2026-11-05 S1f**(봉투 행 = 통장 키 spending · saving · emergency, 급여 통장 몫은 계산) | FR-6 |
| FR-4 | `recurring_template` — 이름 · 금액 · 주기 · 다음 예정일 · `confirm_required`. `recurring_occurrence` — 예정 행 · 확인 여부 | FR-4 |
| FR-5 | `installment` — 원거래 금액 · 개월 수 · 시작 월 · 리볼빙 여부. 월 청구는 계산(저장 안 함) | FR-10 |
| FR-6 | `expense_tag` — 감정 태그 · 다음 날 만족도(1~5). **민감 정보 분류 표시**(`FEATURE-015` FR-5) | FR-13 |
| FR-7 | `month_close` — 월 · 리뷰 3문항 답(텍스트) · 닫은 시각. 평가 점수 열 없음 | FR-9 |
| FR-8 | `landing_issued` — 월 · 발행일 · `p_low` · `p_high` · 방법. 불변 — 다음 달 같은 날짜 적중 판정 근거 | FR-7 |
| FR-9 | `person_ledger` — 상대 이름(사용자 입력) · 주고받음 · 금액 · 행사 · 날짜. 민감 정보 분류 | FR-14 |
| FR-10 | `challenge` — 사용자가 고른 이름 · 기간 · 상태(`active` · `ended`) — **실패 상태 없음**. `challenge_saving` — 아낀 돈 기록(목표에 보탤 때 savings `deposit.source=saved_by_challenge`) | FR-19 |
| FR-11 | `calendar_sticker` — 날짜 · 종류(무지출 · ~~챌린지~~). 연속 일수 열 없음. **정정 2026-11-04** 챌린지 스티커는 `challenge_day`(어느 챌린지 날인지 — S1d 판단 3) | FR-16 · 20 |
| FR-12 | 인덱스 — `expense(user_id, spent_at)` · `expense(user_id, category_id, spent_at)` · `recurring_occurrence(due_on)` | 성능 |
| FR-13 | 원문 금지 검사 — 스키마 테스트가 `raw` · `sms` · `message_text` 같은 열 이름 0 을 확인 | FR-3 |
| FR-14 | `household_setting` — 노동시간 환산(켬 · 시급/월급 · 금액 · 월 근로시간). **민감 정보**(급여). 끄면 값은 남김 — **신설 2026-11-04 S1c** | FR-15 |
| FR-15 | `fixed_cost_hidden` — "고정비 아니에요" 가맹점 키(사용자 · 키 유일). 후보 자체는 저장하지 않는다(지출에서 계산) — **신설 2026-11-04 S1e** | FR-12 |
| FR-17 | `custom_category` — 사용자 · 키(`u_` + 12자리 · 사용자마다 유일) · 이름(1~12) · 묶음(needs · wants) · 보관 시각(지우기 = 보관 — 행이 남는다). 같은 이름은 보관 안 한 것끼리만 유일(부분 인덱스 `lower(name)`) — **신설 2026-11-05 S1f** | FR-6 |
| FR-18 | 이야기 카드 읽기 — 새 표 0(카드는 저장하지 않는다). 기간 안 아낀 돈 합을 사용자 · 날짜로 읽는 인덱스 `challenge_saving (user_id, saved_on)` — **신설 2026-11-05 S1g** | FR-21 |
| FR-16 | `fixed_cost_increase` — 고정비 증가 발행 기록(사용자 · 가맹점 키 · 달 유일 — `ON CONFLICT` 로 한 번만) · 앞 · 이번 금액 · 분류 · 오른 지출. 지출을 지워도 남는다 — **신설 2026-11-04 S1e** | FR-12 · 21 |

## Acceptance Criteria

- [x] 결제 문자 원문 열 0(스키마 테스트)
- [x] `challenge` 상태 값에 실패 없음(2026-11-04 S1d — CHECK `active` · `ended` · 종단 테스트가 제약 정의 · `failed` INSERT 거절을 본다)
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
| FR-2 · 5 · 6 · 9 · 10 · 11 | S1c · 뒤 — **정정 2026-11-04** FR-6 · 11(무지출)은 S1c 닫힘, FR-10 · 11(챌린지)은 S1d 닫힘, 나머지 ~~S1d~~ S1e | 리볼빙 표(FR-5)는 ~~S1c~~ ~~S1d~~ ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

## 구현 현황 — 가계부 S1c (2026-11-04, `requirements/specs/done/MONEY-S1c-household-mirror-slice.md`)

Flyway `V3__feelings_calendar.sql`(로컬 운영 DB 적용 2026-11-04 — `household` 2 → 3).

| FR | 상태 | 비고 |
|---|---|---|
| FR-6 | done — `expense_tag`(PK `expense_id` · FK 지출 `ON DELETE CASCADE` · 감정 CHECK 셋 · `felt_now` · `felt_next` 1~5 · `tagged_on` · `next_decided_at` — 넘김 = 시각만) · 표 주석 `sensitive` · 묻기 부분 인덱스 `(user_id, tagged_on) WHERE next_decided_at IS NULL` | 스펙의 "태그"는 감정 하나 — 표 이름은 스펙 그대로 |
| FR-11 | done(`no_spend`) — `calendar_sticker`(PK `(user_id, sticker_on, kind)` · 연속 일수 열 없음). `day` 대신 `sticker_on`(생성기 낱말 충돌 피함) | ~~챌린지 `kind` 는 S1d~~ **정정 2026-11-04** 챌린지 스티커는 `kind` 대신 `challenge_day`(S1d) |
| FR-14 | done — `household_setting`(PK `user_id` · CHECK 셋: 방식 ⇔ 금액 · 켜려면 금액 · 월 시간은 월급에만) · 표 주석 `sensitive` | 신설 |
| FR-2 · 5 · 9 · 10 | ~~S1d~~ **정정 2026-11-04** FR-10 은 S1d 닫힘, FR-2 · 5 · 9 는 ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

## 구현 현황 — 가계부 S1d (2026-11-04, `requirements/specs/done/MONEY-S1d-household-challenge-slice.md`)

Flyway `V4__challenges.sql`(로컬 운영 DB 적용 2026-11-04 — `household` 3 → 4).

| FR | 상태 | 비고 |
|---|---|---|
| FR-10 | done — `challenge`(이름 1~40 · 기간 CHECK · 상태 `active` · `ended` — **실패 없음** · 상태 ⇔ `ended_on` 짝) · `challenge_saving`(금액 > 0 · 메모 100자 · 보탠 목표 `goal_id` ⇔ `contributed_at` 짝 · 저축 스키마 FK 없음) | 수용 기준 2 충족 |
| FR-11 챌린지 | done — `challenge_day`(PK `(challenge_id, marked_on)` · 연속 일수 열 없음). 스펙의 `calendar_sticker` kind 대신(판단 3) | 달력은 `(user_id, marked_on)` 인덱스 |
| FR-12 | `challenge (user_id, created_at DESC)` · `challenge_day (user_id, marked_on)` · `challenge_saving (challenge_id)` | EXPLAIN 0.2ms 아래 |
| FR-2 · 5 · 9 | ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

## 구현 현황 — 가계부 S1e (2026-11-04, `requirements/specs/done/MONEY-S1e-household-fixed-cost-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-15 | done — `fixed_cost_hidden`(PK `(user_id, merchant_key)` · 키 1~40자) | 숨김은 후보 · 증가 발행 둘 다에서 뺀다 |
| FR-16 | done — `fixed_cost_increase`(UNIQUE `(user_id, merchant_key, month)` · CHECK `current > previous > 0`) | 이벤트 본문에는 가맹점 키를 싣지 않는다 |
| FR-12 | `expense (user_id, spent_on) WHERE merchant IS NOT NULL AND precision = 'exact' AND input_kind <> 'template'`(후보 표본) | EXPLAIN 0.055ms(행 2만 넣고 롤백) · 분류 기준은 기존 `(user_id, spent_on)` 0.037ms |
| FR-2 · 5 · 9 | ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

## 구현 현황 — 가계부 S1f (2026-11-05, `requirements/specs/done/MONEY-S1f-household-categories-accounts-slice.md`)

Flyway `V6__custom_categories_account_split.sql`(로컬 운영 DB 적용 2026-11-05 — `household` 5 → 6).

| FR | 상태 | 비고 |
|---|---|---|
| FR-17 | done — `custom_category`(UNIQUE `(user_id, category)` · 키 꼴 CHECK · 이름 길이 · 묶음 CHECK · 부분 유일 `(user_id, lower(name)) WHERE archived_at IS NULL`) | 지출 원장 열 변경 0(V1 이 `category` 에 CHECK 를 두지 않았다) |
| FR-3 | done — `budget.method` · `month_close.budget_method` CHECK 에 `account_split` · 소득 있는 방식 둘 | 마감 사본도 같은 방식 |
| FR-12 | 새 인덱스 0 — 분류 표는 유일 키 인덱스, 월 합은 기존 `(user_id, spent_on)` | EXPLAIN 0.014ms · 0.084ms |
| FR-5 · 9 | S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

## 구현 현황 — 가계부 S1g (2026-11-05, `requirements/specs/done/MONEY-S1g-household-story-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-18 | done — V7 `challenge_saving_user_day_idx (user_id, saved_on)` 하나 · 새 표 · 열 0 | 다른 재료는 기존 인덱스(`expense_user_day_idx` · `challenge_day_user_idx` · `calendar_sticker` PK) |
| FR-5 · 9 | S1h | 슬라이스 범위 밖 |

## 구현 현황 — 가계부 S1h (2026-11-05, `requirements/specs/done/MONEY-S1h-household-revolving-people-slice.md`)

Flyway `V8__revolving_people.sql`(로컬 운영 DB 적용 2026-11-05 — `household` 7 → 8).

| FR | 상태 | 비고 |
|---|---|---|
| FR-5 | done — **정정**: 리볼빙은 `installment` 표의 "리볼빙 여부"가 아니라 `revolving_plan` 표(할부는 S1a 부터 지출 열 `installment_months`). 이월 잔액 > 0 · 결제비율 CHECK 10~100 · 수수료율 `numeric(4,2)` 0 초과 20 이하 · 명세서 달 = 달 첫날 CHECK · `ended_on` · 월 청구는 계산(저장 0) | 인덱스 `(user_id, statement_month)` |
| FR-9 | done — `person_entry`(이름 1~20 · 방향 · 어떤 일 CHECK · 금액 > 0 · 메모 100) · 표 주석 `sensitive` | 인덱스 `(user_id, happened_on)` · `(user_id, person)` |
| FR-19(신설) | done — `occasion_envelope`(PK `(user_id, for_year)` · 해 CHECK 2000~2100 · 금액 > 0) — 한 해 경조사 봉투, 남은 금액은 계산 | 열 이름 `year` 대신 `for_year`(코드 생성기 H2 예약어) |

EXPLAIN(사람 장부 2만 행 · 명세서 2천 행 넣고 롤백): 사람별 합 `person_entry_user_person_idx` 0.100ms · 해 줄 `person_entry_user_day_idx` 0.009ms · 한 사람 0.044ms · 월 띠 `revolving_plan_user_idx` 0.022ms.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-04 | 가계부 S1a — in-progress. V1(`63146ddf`) · FR-1 · 3 · 8 · 12 · 13. 수용 기준 1 · 3 충족(2 `challenge` 는 S1b) |
| 2026-11-04 | 리뷰 반영 `85512af5` — 스키마 변경 0(착지 계산 · 원 단위 검사는 서비스). `landing_issued.spent_so_far` 의 뜻이 "그날 시작 시점 합"으로 |
| 2026-11-04 | EXPLAIN 확인(행 2만 넣고 롤백 — 다섯 쿼리 인덱스 · 1ms 미만) |
| 2026-11-04 | 가계부 S1b — V2(`a32d349e`) · FR-4 · 7 · 12 done · `landing_issued.scheduled`. EXPLAIN 확인(행 넣고 롤백) |
| 2026-11-04 | 가계부 S1c — V3(`dd330297`) · FR-6 · 11(무지출) · FR-14 신설(설정) done. EXPLAIN(행 2만 넣고 롤백 — 네 쿼리 인덱스 · 0.08ms 아래) |
| 2026-11-04 | 가계부 S1d — V4(`8d0e2723`) · FR-10 · FR-11(챌린지 — `challenge_day`) done · 수용 기준 2 충족. EXPLAIN(행 2만 넣고 롤백 — 다섯 쿼리 인덱스 · 0.2ms 아래) |
| 2026-11-04 | 가계부 S1e — FR-15 · 16 신설 · FR-12 부분 인덱스(V5 `98895870`). 로컬 운영 DB 적용(household 4 → 5) |
| 2026-11-05 | 가계부 S1f — FR-17 신설 · FR-2 정정 · FR-3 `account_split`(V6 `96c7c5b4`). 로컬 운영 DB 적용(household 5 → 6 — 슬라이스 경로 주석을 고치느라 push 전 한 번 되돌려 다시 적용) |
| 2026-11-05 | 가계부 S1g — FR-18 신설 · done(V7 `2c31ce55`). 로컬 운영 DB 적용(household 6 → 7 — 주석 경로를 고치느라 push 전 한 번 되돌려 다시 적용). EXPLAIN(행 2만 넣고 롤백 — 아낀 돈 0.124ms) |
| 2026-11-05 | 가계부 S1h — FR-5 정정 · done(`revolving_plan`) · FR-9 done · FR-19 신설 · done(V8 `f998f36d`). 로컬 운영 DB 적용(household 7 → 8 — 한 번에, 주석 경로는 루트 슬라이스 이름 그대로). EXPLAIN 넷 0.1ms 아래 |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`) — 이 REQ 에 걸린 몫: `household.FixedCostIncreased` 계약 설명의 "구독 예정" 정정(금융 팁 S2b — S2a 는 저축 두 이벤트만). 필드 · 스키마 무변경 |
| 2026-11-05 | 금융 팁 S2b(루트 `requirements/specs/done/MONEY-S2b-tips-quiz-diff-slice.md`) — 이 REQ 에 걸린 몫: `household.FixedCostIncreased` 계약 설명의 구독 예정 칸 ~~금융 팁 S2b~~ → 금융 팁 S2d. 필드 · 스키마 무변경 (`a1938bb2`) |
| 2026-11-05 | 금융 팁 S2d(루트 `requirements/specs/done/MONEY-S2d-tips-my-numbers-slice.md`) — 이 REQ 에 걸린 몫: `household.FixedCostIncreased` 계약 설명 "구독 예정" → **구독**(content, category = housing 만 · 금액 읽지 않음) · `contracts/events/README.md` 구독자 칸. 필드 · 스키마 무변경 (`1a85dd2b`) |
| 2026-11-12 | 서버 S3c 내 데이터(짝 — 루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`): Flyway V9 — 발행 원장 `landing_issued` 트리거에 계정 삭제 예외 하나(`salt.erase` 켠 DELETE 만, UPDATE 는 그대로 막음). 이 REQ 몫 기능 변경 0 |
