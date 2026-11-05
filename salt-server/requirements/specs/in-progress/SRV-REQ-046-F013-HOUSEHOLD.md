---
id: SRV-REQ-046
feature: F013
area: server
kind: API
title: "household 서비스(Kotlin, S1) — 빠른 입력 · 문자 파싱 · 반복 · 봉투 · 착지 구간 · 목표 시계 · 재미"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-013-household-budget.md
---

## Summary

신규 서비스. 입력은 수동(연동 0). 예산은 막지 않는다 — 초과는 숫자로만. 금액 · 착지 · 지연 일수는 전부 서버.

## FR

| FR | 내용 | FEATURE-013 |
|---|---|---|
| FR-1 | 지출 저장 — 금액 · 분류 · 결제수단 · 태그. 저장 응답에 목표 시계(savings 지연 일수 조회, 50ms 타임아웃 → 넘으면 `goalClock:"pending"`) | FR-1 · 8 |
| FR-2 | 최근 항목 · 가맹점 제안 — 사용자 최근 30일 빈도 | FR-1 |
| FR-3 | 한 줄 파싱 `POST /parse` — 금액은 정규식으로 확정, 분류는 규칙 → (선택) LLM 제안. LLM 에 금액 · 가맹점 외 개인정보 0, 실패해도 저장 막지 않음 | FR-2 |
| FR-4 | 결제 문자 다건 파싱 — 금액 · 가맹점 · 일시 · 할부 개월. 카드번호 · 이름 패턴은 파싱 전에 마스킹, **원문은 요청 메모리에서만 · 로그 0 · 저장 0**. 저장 전 후보 목록만 반환 | FR-3 |
| FR-5 | 반복 템플릿 — 일 1회 워커(ShedLock)가 예정 행 생성, 확인 전에는 착지 계산에 "예정"으로만 | FR-4 |
| FR-6 | 대략 합계 — `precision:approx`. 월 통계에서 정확/대략 분리 | FR-5 |
| FR-7 | 봉투 — 남은 금액 · 하루 가용액. 초과는 음수 값만(경고 · 차단 응답 0). 방식 `50_30_20` · `envelope` · `account_split`(통장 쪼개기 이름표 — **done 2026-11-05 S1f**) | FR-6 |
| FR-8 | 월말 착지 구간 — 지금까지 + 예정 반복 + 변동 일평균 분포 × 남은 날. `landing_issued` 기록 · 지난달 같은 날짜 적중 여부 | FR-7 |
| FR-9 | 월 마감 리뷰 3문항 저장 · `MonthClosed` 발행 | FR-9 |
| FR-10 | 할부 · 리볼빙 띠 — 원거래 + 남은 월 청구 계산 | FR-10 |
| FR-11 | 공제 계기판 — 총급여(사용자 입력) 25% 문턱 · 결제수단별 추정. 공제율 · 한도는 content 파라미터 · 기준 연도, `estimate:true` | FR-11 |
| FR-12 | 고정비 · 이상치 — 약 30일 주기 반복 감지 · 분류 중앙값 배수. 고정비 증가 시 content 트리거용 이벤트 — **done 2026-11-04 S1e** | FR-12 |
| FR-13 | 감정 태그 · 다음 날 만족도 거울(분포만, 평가 문구 0) — **done 2026-11-04 S1c** | FR-13 |
| FR-14 | 사람 장부 · 경조사 봉투 | FR-14 |
| FR-15 | 노동시간 환산(시급 ~~사용자 입력~~ **정정 2026-11-04** 또는 월급 ÷ 월 근로시간 — 사용자 입력) — **done 2026-11-04 S1c** | FR-15 |
| FR-16 | 무지출일 달력 · 스티커(연속 일수 계산 안 함) — **무지출 done 2026-11-04 S1c** · **챌린지 스티커 done 2026-11-04 S1d** | FR-16 · 20 |
| FR-17 | 영수증 인식 — 보류(Could, 한국어 정확도 실측 뒤 별도 REQ) | FR-17 |
| FR-18 | 홈 요약 카드 — 이번 달 지출 · 착지 · 예산 남은 금액 | FR-18 |
| FR-19 | 챌린지 — 사용자 선택 · 언제든 종료 · 아낀 돈 기록 → 목표에 보태기(savings 적립 `source=saved_by_challenge`) — **done 2026-11-04 S1d** | FR-19 |
| FR-20 | 이야기 카드 — 월말 · 연말 집계(가장 많이 쓴 분류 · 스티커 수 등). 공유 이미지는 금액 가림이 기본 | FR-21 |
| FR-22 | 사용자 분류 — 이름(1~12자) · 묶음(needs · wants) · 보관(지우기 — 지난 지출 · 봉투 · 템플릿 이름은 남는다) · 보관 안 한 것 20개. 키는 서버가 짓는다(`u_` + 12자리) — **신설 · done 2026-11-05 S1f** | FR-6 |
| FR-21 | 발행 — `ExpenseRecorded` · `MonthClosed` · `FixedCostIncreased` · `LandingIssued`(착지 구간 발행 — 채점 `FC-REQ-024`) — **done 2026-11-04**(넷 다 — `FixedCostIncreased` 는 S1e) | — |

## API (Swagger)

`POST /api/household/expenses` · `GET /api/household/expenses?month=` · `POST /api/household/parse` · `GET/POST /api/household/templates` ·
`GET /api/household/month/:ym` · `POST /api/household/month/:ym/close` · `GET/PUT /api/household/budget` · `GET /api/household/home-card` · `GET/POST /api/household/challenges` · `POST /api/household/fixed-costs/hide` · `POST /api/household/fixed-costs/show`(S1e — 후보 목록은 월 화면 `fixedCosts`) · `GET/POST /api/household/categories` · `PUT/DELETE /api/household/categories/:key`(S1f)

## Acceptance Criteria

- [x] 결제 문자 원문이 DB · 로그 · 추적에 0(로그 캡처 테스트)
- [x] 예산 초과 응답에 경고 · 차단 필드 0
- [x] 카드사 문자 표본 파싱 테스트(마스킹 포함)
- [x] 착지 구간 백테스트(지난 3개월 표본) 결과 기록 — 2026-11-04 생활 꼴 셋 흉내(고정 난수) 3개월 79.7%(220/276) · 36개월 82.1%(꾸준형 74.7 · 주말형 79.0 · 월세형 92.4) · `LandingBacktestSpec`(실사용 표본은 채점 `FC-REQ-024` 이 이어 본다)

## 계약 영향

- DB `DB-REQ-038` · BFF `BFF-REQ-048` · 프론트 `FE-REQ-057` · RN `RN-REQ-034` · savings `SRV-REQ-045` FR-17

## 구현 현황 — 가계부 S1a (2026-11-04, `requirements/specs/done/MONEY-S1-household-entry-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 | **done** — 저장(한 건 · 여러 건 한 트랜잭션) · 응답에 그 분류의 봉투 · 이번 달 합 · `savedTotal`. **목표 시계는 서버가 아니라 BFF 가 붙인다**(슬라이스 판단 1 — 서비스 간 동기 호출 0). 50ms 대신 BFF 300ms 예산 → `pending` | `RecordExpenses` · `POST /expenses` · `/expenses/batch` |
| FR-2 | done — 최근 30일 가맹점 횟수 순 8개 + 마지막 분류 · 금액(창 함수 한 문장) | `GET /suggestions` |
| FR-3 | done(규칙만) — 금액 정규식(만 · 천 · 쉼표 · 영문 뒤 숫자 제외) · 분류 = 최근 같은 가맹점 → 낱말 표. **LLM 0**(판단 5) | `POST /parse` mode=line |
| FR-4 | done — 카드번호 · 이름 · 누적 금액을 파싱 전에 지움 · 원문은 인자로만(저장 · 로그 · 예외 메시지 0, 테스트로 확인) · 취소 문자 버림 · 할부 개월 · 연도 넘김 | `InputParser.messages` · mode=messages |
| FR-6 | done — `precision approx` 는 `inputKind approx` 에서만(DB CHECK 와 같은 뜻) · 월 합에서 정확/대략 분리 | `Expense.create` · `monthSummary` |
| FR-7 | done(`50_30_20` · `envelope`) — 남은 금액 음수 그대로 · 하루 가용(내림, 0 이하면 0). 경고 · 차단 필드 0. `account_split` 은 S1b | `BudgetMath` · `GET/PUT /budget` |
| FR-8 | done — **오늘 시작 기준**: 어제까지 합 + ~~첫 저장일~어제 날별 합의 연속 창 합 10 · 90% 분위 × 오늘 포함 남은 날~~ **정정 2026-11-04 `5e5894dd`** 남은 날 ≤ 7 이면 연속 창 합 분위, 더 길면 요일 평균 합 ± 1.2816 × sd(7일 합) × √(R/7)(무작위 0 · 백테스트 3개월 79.7%(220/276) · 36개월 82.1%(꾸준형 74.7 · 주말형 79.0 · 월세형 92.4)) · 14일 미만이면 `history_short` · ~~말일 `month_over`~~ **정정 2026-11-04** 말일에도 구간(`month_over` 는 계약 값만) · 지난달 같은 날짜 발행 vs 실제 합 적중 | `LandingEngine` · `GET /month/:ym` |
| FR-18 | done — 이번 달 지출 · 건수 · 예산 남은 금액 · 착지 | `GET /home-card` |
| FR-21 | 일부 — `ExpenseRecorded` · `LandingIssued`. `MonthClosed` · `FixedCostIncreased` 는 S1b | `OutboxHouseholdEvents` |
| FR-5 · 9~17 · 19 · 20 | S1b · 뒤 | 슬라이스 범위 밖 |

API 실제 목록: `POST /expenses` · `POST /expenses/batch` · `DELETE /expenses/:id` · `POST /parse` · `GET /suggestions` · `GET/PUT /budget` · `GET /month/:ym` · `GET /home-card`. 스펙의 `GET /expenses?month=` 는 월 화면 응답 `expenses` 로 들어갔다(목록 300건 · 합계는 전부). 템플릿 · 마감 · 챌린지 경로는 S1b.

## 구현 현황 — 가계부 S1b (2026-11-04, `requirements/specs/done/MONEY-S1b-household-month-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-5 | **done** — 템플릿(매달 하나 · `day_of_month` 짧은 달은 말일 · 상한 30) · 예정 행 달마다 하나 · 워커 매시 5분(ShedLock, `INSERT … SELECT … ON CONFLICT` 한 문장 — "일 1회" 대신 놓친 회차를 다음 시간이 메움) · 확인 필요 없는 템플릿만 예정일에 지출로 · 확인 전엔 착지에 "예정"만 | `RecurringTemplate` · `RunRecurring` · `RecurringWorker` · `GET/POST/PUT/DELETE /templates` · `POST /occurrences/:id/confirm\|skip` |
| FR-8 | 개정 — 착지 = 어제까지 + **아직 확인 안 한 예정** + 변동 분포. 변동 표본에서 템플릿 지출을 뺀다(날별 합 `FILTER` 한 문장). 발행 기록 · 이벤트에 `scheduled` | `LandingEngine.project(scheduled)` · `LandingReader` |
| FR-9 | **done** — 리뷰 3문항(키 `satisfied` · `try_next` · `known_next`, 300자, 비워도 닫힘, 점수 0) · 닫을 수 있는 달 = 지난 달 + 이번 달 마지막 3일 · 처음 닫을 때 그달 예산 사본 · 다시 내면 답만 · `MonthClosed` 처음 한 번 | `CloseMonth` · `POST /month/:ym/close` · 월 화면 `close` · `closable` |
| FR-10 | **done(할부)** — 첫 청구는 산 다음 달 · 원 단위 나머지는 첫 달 · 회차 합 = 원거래(테스트) · 앞으로 6개월은 그 달 끝까지 산 할부만. 리볼빙은 ~~S1c~~ ~~S1d~~ ~~S1e~~ S1f(**정정 2026-11-05** S1f 는 통장 쪼개기 · 사용자 분류를 닫았고 사람 장부 · 이야기 카드 · 리볼빙은 S1g)(정정 2026-11-04 — S1e 는 고정비 · 이상치만)(정정 2026-11-04 — S1d 는 챌린지만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | `InstallmentPlan` · `InstallmentMath.band` · 월 화면 `installments` |
| FR-21 | `MonthClosed` 추가(답 글 0). `FixedCostIncreased` 는 ~~S1c~~ ~~S1d~~ S1e(정정 2026-11-04 — S1d 는 챌린지만) | `OutboxHouseholdEvents` — **정정 2026-11-04** 고정비 · 이상치(`FixedCostIncreased`)는 S1e 닫힘(`MONEY-S1e-household-fixed-cost-slice.md`), 나머지는 S1f(**정정 2026-11-05** S1f 는 통장 쪼개기 · 사용자 분류를 닫았고 사람 장부 · 이야기 카드 · 리볼빙은 S1g) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |
| FR-1 | 확인한 지출도 같은 길(`ExpenseWriter` — 이벤트 · 착지 발행 · 봉투). 지출을 지우면 이어진 예정 행을 먼저 "예정"으로 되돌린다 | `DeleteExpense` |
| FR-7 `account_split` · 11~16 · 19 · 20 · FR-21 `FixedCostIncreased` | S1c · 뒤 — **정정 2026-11-04** FR-13 · 15 · 16 은 S1c 닫힘, FR-19 · 챌린지 스티커는 S1d 닫힘, 나머지 ~~S1d~~ S1e | 슬라이스 범위 밖 — **정정 2026-11-04** 고정비 · 이상치(`FixedCostIncreased`)는 S1e 닫힘(`MONEY-S1e-household-fixed-cost-slice.md`), 나머지는 S1f — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

쿼리(종단 테스트 고정): 월 화면 11(+ 마감 1 · 예정 1 · 할부 1) · 저장 10/9 · 홈 카드 6. EXPLAIN — 사용자별 셋 0.05ms 아래, 워커 쿼리 템플릿 2만에서 4ms(로컬 운영 DB, 행 넣고 롤백).

## 구현 현황 — 가계부 S1c (2026-11-04, `requirements/specs/done/MONEY-S1c-household-mirror-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-13 | **done** — 감정 태그 지출당 하나(`stress` · `reward` · `boredom`) + 산 직후 만족(선택 1~5) · 저장 때 같이(`emotion` · `feltNow`) 또는 `PUT /expenses/:id/feeling`(본인 지출만 — `INSERT … SELECT … ON CONFLICT` 한 문장) · 다음 날 ~ 7일 한 번 묻기(답 · 넘김 조건부 UPDATE — 두 번째 409, 당일 400) · 거울 = 그 달 태그별 1~5점 건수(평균 · 점수 0) · 이벤트 · 로그 0 | `Feeling.kt` · `TagFeeling` · `AnswerNextDay` · `GET /month/:ym` `feelings` |
| FR-15 | **done** — 시급 또는 월급 ÷ 월 근로시간(기본 209) · 켰을 때만 근무 분(지출 · 저장 합 · 달 합, 분 반올림 한 번) · 끄면 급여 남김 · 거절 표 9 | `WorkHours.kt` · `GET/PUT /settings/work-hours` · 저장 응답 `savedWorkMinutes` |
| FR-16 | **done(무지출)** — 사용자가 "안 쓴 날" 표시(지출 있는 날 400 · 멱등) · 달력 칸 상태 future · spent · no_spend · blank + `markable` · `weekday` · 표시 뒤 지출이면 숨김(행은 남김) · 연속 일수 0. 챌린지 스티커는 S1d | `Calendar.kt` · `PUT/DELETE /no-spend/:date` · 월 화면 `calendar` |
| FR-7 `account_split` · 12 · 14 · 19 · 20 · FR-21 `FixedCostIncreased` | ~~S1d~~ **정정 2026-11-04** FR-19 는 S1d 닫힘(아래 S1d 표), 나머지 S1e(공제 FR-11 은 S2 content 뒤) | 슬라이스 범위 밖 — **정정 2026-11-04** 고정비 · 이상치(`FixedCostIncreased`)는 S1e 닫힘(`MONEY-S1e-household-fixed-cost-slice.md`), 나머지는 S1f — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

쿼리(종단 테스트 고정): 월 화면 11 → **16**(태그 · 달력 날별 합 · 스티커 · 설정 · 이번 달 묻기) · 저장 10/9 → **11/10**(설정 — 감정을 달면 +1) · 홈 카드 6. EXPLAIN — 넷 다 인덱스 · 0.08ms 아래(로컬 운영 DB, 행 2만 넣고 롤백).

## 구현 현황 — 가계부 S1d (2026-11-04, `requirements/specs/done/MONEY-S1d-household-challenge-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-19 | **done** — 사용자가 이름(1~40자) · 기간(1~92일, 시작 오늘~30일 뒤)을 고른다 · 진행 · 예정 5개 상한(409 — 잠그지 않음, 판단 6) · 상태 `active` · `ended` 둘(실패 0) · 단계 `upcoming` · `running` · `ended`(기간 지남 = 그만둠 — 같은 끝) · 그만두기 멱등(조건부 UPDATE) · 아낀 돈(원 단위 · 1천만 원 · 메모 100자 · 기간 안) · 보탠 것은 못 지움(409) · 보탰다 적기(같은 목표 재시도 통과 · 다른 목표 409) | `Challenge.kt` · `ChallengeUseCases.kt` · `ChallengeController`(`/challenges` · `/challenges/:id/end` · `/challenges/:id/days/:date` · `/challenges/:id/savings` · `/challenge-savings/:id`(GET · DELETE) · `/challenge-savings/:id/contribution`) |
| FR-16 챌린지 스티커 | **done** — "한 날"은 표시한 날만(기간 안 · 오늘까지 · 그만둔 날까지, 끝난 뒤 지난 날도 받음) · 달력 칸에 상태와 따로(`challenge`) · 개수만(`challengeDays`) · 연속 0 | `CalendarRules.month(challengeDays)` · 월 화면 `calendar` |
| 목표에 보태기 | 서비스 간 호출 0 — 금액 · 날짜 읽기(`GET /challenge-savings/:id`)와 "보탰다"(`PUT …/contribution`)만 둔다. 저축 적립은 BFF 가 부른다(슬라이스 판단 4) | `GetChallengeSaving` · `MarkSavingContributed` |
| FR-7 `account_split` · 12 · 14 · 20 · FR-21 `FixedCostIncreased` · 리볼빙 · 사용자 분류 | S1e(공제 FR-11 은 S2 content 뒤) | 슬라이스 범위 밖 — **정정 2026-11-04** 고정비 · 이상치(`FixedCostIncreased`)는 S1e 닫힘(`MONEY-S1e-household-fixed-cost-slice.md`), 나머지는 S1f — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

쿼리(종단 테스트 고정): 월 화면 16 → **17**(달력 한 날) · 저장 11/10 · 홈 카드 6 그대로 · 챌린지 목록 4(챌린지 · 열린 수 · 날 · 아낀 돈). EXPLAIN — 다섯 다 인덱스 · 0.2ms 아래(로컬 운영 DB, 행 2만 넣고 롤백).

## 구현 현황 — 가계부 S1e (2026-11-04, `requirements/specs/done/MONEY-S1e-household-fixed-cost-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-12 고정비 | **done** — 후보는 저장하지 않고 표본(가맹점 있는 정확한 직접 입력 120일)에서 센다 · 가맹점 키(공백 지움 · 소문자) · 앞 고리 = 비슷한 금액(이웃 30% 안)의 바로 앞 지출 · 간격 25~35일 · 세 번 이상 · 마지막 회차 40일 안 · 숨긴 키 · 템플릿 이름 키 제외 · 다음 예정일 = 다음 달 같은 날 · 오름 = 앞 회차보다 5% 이상(아니면 `increase` null) · 이번 달 화면에만 | `FixedCost.kt` `FixedCostRules` · `FixedCostReader` · 월 화면 `fixedCosts` · `POST /fixed-costs/hide` · `/show`(키는 본문 — 서버가 준 키 그대로만, 아니면 400 `FIXED_COST_KEY_INVALID`) |
| FR-12 이상치 | **done** — 그달 앞 90일 분류 중앙값(`percentile_disc`)의 3배 이상 · 표본 5개 이상 · 정확한 직접 입력만 · 고정비 후보 · 템플릿 이름 가맹점 제외 · 응답은 그 중앙값 하나(`typicalAmount`, 배수 · 평가 0) | `UnusualRules` · 월 화면 `expenses[].typicalAmount` |
| FR-21 `FixedCostIncreased` | **done** — 이번에 적은 지출이 후보의 마지막 회차이고 올랐으면 `fixed_cost_increase` `ON CONFLICT DO NOTHING` → 넣었을 때만 발행(가맹점 · 달마다 한 번 · 지우고 다시 적어도 1) · 본문에 가맹점 · 메모 0 · 가맹점 있는 직접 입력이 없으면 쿼리 0 | `FixedCostWatcher` · `ExpenseWriter.afterInsert` · `OutboxHouseholdEvents` · `contracts/events/household.FixedCostIncreased.json` |
| FR-7 `account_split` · FR-10 리볼빙 · 14 · 20 · 사용자 분류 | S1f(공제 FR-11 은 S2 content 뒤) | 슬라이스 범위 밖 — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

쿼리(종단 테스트 고정): 월 화면 17 → **21**(표본 · 숨긴 키 · 템플릿 이름 · 분류 기준) · 저장(가맹점 없음) 11/10 · 홈 카드 6 그대로. 가맹점 있는 직접 입력 저장은 +3(+ 오르면 기록 · 아웃박스). EXPLAIN — 표본 부분 인덱스 0.055ms · 기준 0.037ms(로컬 운영 DB, 행 2만 넣고 롤백).

## 구현 현황 — 가계부 S1f (2026-11-05, `requirements/specs/done/MONEY-S1f-household-categories-accounts-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-22 사용자 분류 | **done** — 키는 기본 12 + `u_` 난수 12자리(같은 `expense.category` 열) · 묶음 · 고를 수 있나 · 순서는 `CategoryBook` 한 곳 · 넣기 한 문장(상한 · 같은 이름은 문장 안 — 못 넣었으면 그 뒤 읽어 409 두 코드) · 이름 · 묶음 고치기(다른 보관 안 한 분류와 같은 이름이면 409) · 보관(다시 404) · 보관한 분류로 새 지출 · 새 봉투 · 새 템플릿 400(고치는 템플릿이 이미 든 분류 · 지금 예산에 이미 있던 봉투는 그대로 받음 — 봉투는 `a45d4cd5`) · 제안은 보관한 분류를 내지 않음 | `Categories.kt` · `CategoryUseCases.kt` · `CategoryController`(`/categories`) · `JooqCustomCategories` |
| FR-7 `account_split` | **done** — 소득 + 생활비 · 저축 · 비상금 통장(0 이면 빈 칸) · 셋의 합 > 소득이면 400 `BUDGET_SPLIT_OVER_INCOME` · 급여 통장 몫 = 소득 − 셋(`salaryShare` — 저장 안 함) · 반복 템플릿 지출 = 급여 통장, 나머지 = 생활비 통장(봉투 밖 0) · 저축 · 비상금은 지출이 들지 않는 칸 · 월 마감 사본도 이 방식 | `Budget.kt` `Accounts` · `BudgetMath.envelopes(budget, summary, book)` · 월 합 `templateSpent` |
| 이벤트 | `ExpenseRecorded.category` 에 사용자 분류 키(이름 0) — 계약에 꼴 추가(`SRV-REQ-044`) | `contracts/events/household.ExpenseRecorded.json` |
| FR-10 리볼빙 · 14 · 20 | S1g(공제 FR-11 은 S2 content 뒤) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

쿼리(종단 테스트 고정): 월 화면 21 → **22**(분류 표) · 저장 11/10 · 홈 카드 6 그대로(기본 분류 · 봉투 방식 — 내 분류 꼴 키를 적거나 50/30/20 이면 +1). EXPLAIN — 월 합 0.084ms · 분류 표 0.014ms(행 넣고 롤백).

## 구현 현황 — 가계부 S1g (2026-11-05, `requirements/specs/done/MONEY-S1g-household-story-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-20 이야기 카드 | **done** — `GET /story/{period}`(YYYY-MM · YYYY) · 줄은 사실만(쓴 돈 · 가장 많이 쓴 분류 몫 % · 가장 많이 쓴 달(해 · 달 둘 이상) · 안 쓴 날 · 챌린지 한 날 · 아낀 돈 · 기분 남긴 수) · 값이 없으면 줄 없음 · 같은 합이면 분류 표 순서 · 앞 달 · 스티커 뒤 지출 날은 안 쓴 날에서 빠짐 · 볼 수 있는 날 = 월 마감 규칙(아니면 `readyOn` · 쿼리 0) · 미래 400 `STORY_PERIOD_FUTURE` · 형식 400 `STORY_PERIOD_INVALID` · 저장 · 이벤트 0 · 금액은 그대로(가림은 화면) | `Story.kt` `StoryRules` · `GetStory` · `StoryController` · `JooqStories` |
| FR-10 리볼빙 · 14 | S1h(공제 FR-11 은 S2 content 뒤) | 슬라이스 범위 밖 |

쿼리(종단 테스트 고정): 이야기 카드 6(지출 묶음 한 문장 · 스티커 · 챌린지 날 · 아낀 돈 · 기분 수 · 분류 표) · 월 22 · 저장 11/10 · 홈 6 그대로. EXPLAIN — 지출 묶음 0.068ms · 아낀 돈(V7 인덱스) 0.124ms · 기분 수 0.312ms(행 2만 넣고 롤백).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-04 | 가계부 S1a — in-progress. Kotlin `services/household` 첫 판(`63146ddf`) · FR-1~4 · 6~8 · 18 · 21 일부. 목표 시계는 BFF 조립(`b162ac6f`) + 저축 조회(`a16356f6`). 수용 기준 3/4(백테스트는 3개월 표본 뒤) |
| 2026-11-04 | 리뷰(high) 1회 반영 `85512af5` — 착지 "오늘 시작 기준"(어제까지 + 오늘 포함 남은 날 — 그날 첫 저장 발행이 그날 나머지를 놓치던 것 · 말일 한 점) · 표본 시작 = 첫 저장일 · `1만2000` · `1,200만` · 소수 원 거절. 재리뷰 없음(규칙: 리뷰는 슬라이스당 1회) |
| 2026-11-04 | `5e5894dd` — 백테스트에서 구간이 이름표보다 좁았다(36개월 67.9%) → 긴 남은 기간 정규 근사로 82.1%. 수용 기준 4/4 · 쿼리 수 종단 테스트(월 8 · 저장 9/8 · 홈 5) |
| 2026-11-04 | 가계부 S1b — FR-5 · 9 · 10(할부) done · FR-8 개정(예정 더함 · 템플릿 표본 제외) · FR-21 `MonthClosed`(`a32d349e`). 도메인 테스트 +10 · 종단 테스트 +5(17) |
| 2026-11-04 | `922cd25a` — 주석 · 이벤트 설명의 낡은 "S1b"(사용자 분류 · 통장 쪼개기 → S1c, 저축 구독 → 저축 S2). 적용된 V1 · V2 주석은 체크섬 때문에 그대로 |
| 2026-11-04 | 가계부 S1c — FR-13 · 15 · 16(무지출) done(`dd330297`). 도메인 테스트 +7(37) · 종단 테스트 +4(21) · 쿼리 수 월 16 · 저장 11/10 |
| 2026-11-04 | `672f892d` — 주석의 낡은 "S1c"(사용자 분류 · 통장 쪼개기 · 리볼빙 · 고정비 감지 → S1d). 적용된 V1~V3 SQL 주석은 체크섬 때문에 그대로 |
| 2026-11-04 | 가계부 S1d — FR-19 챌린지 · FR-16 챌린지 스티커 done(`8d0e2723`). 도메인 테스트 +7(44) · 종단 테스트 +3(24) · 쿼리 수 월 17. 범위를 다시 나눴다 — 사람 장부 · 이야기 카드 · 고정비 · 리볼빙 · 통장 쪼개기 · 사용자 분류는 S1e |
| 2026-11-04 | `7eb8004d` — 주석의 낡은 "S1d"(사용자 분류 · 통장 쪼개기 · 리볼빙 · 고정비 감지 → S1e). 적용된 V3 SQL 주석("챌린지 스티커는 S1d 에 kind")은 체크섬 때문에 그대로 — 실제는 `challenge_day` 표(V4) |
| 2026-11-04 | 가계부 S1e — FR-12 고정비 · 이상치 · FR-21 `FixedCostIncreased` done(`98895870`, FR-21 전부 닫힘). 도메인 테스트 +9 · 종단 +2(26) · 쿼리 수 월 21. 범위를 다시 나눴다 — 사람 장부 · 이야기 카드 · 리볼빙 · 통장 쪼개기 · 사용자 분류는 S1f · 같은 커밋에서 주석의 낡은 "S1e" → S1f |
| 2026-11-05 | 가계부 S1f — FR-22 사용자 분류 신설 · done · FR-7 `account_split` done(`96c7c5b4`). 도메인 테스트 +8 · 종단 +3(29) · 쿼리 수 월 22. 범위를 다시 나눴다 — 사람 장부 · 이야기 카드 · 리볼빙은 S1g · 옛 "S1f" 포인터 정정(주석 `MonthClose.kt` 도 같은 커밋) |
| 2026-11-05 | 가계부 S1f 확인 단계 — 서버 코드 변경 0 · 종단 테스트 +1(30 — 보관한 분류 템플릿, `7961a322`). 최종 HEAD `./gradlew check` 다시 통과 · 보관한 분류가 든 템플릿 고치기 200 · 새 템플릿 400(실스택) · 한계 기록: 보관한 분류의 고정비 후보 "매달 적기로" 400 |
| 2026-11-05 | `a45d4cd5` — 지금 예산에 있던 봉투는 그 분류를 보관해도 다시 저장된다(`Budget.envelopes(keep)` · 보관 키가 들어왔을 때만 지금 예산을 읽음). 사용자 "베스트케이스로" — 한계 기록을 닫음. 도메인 · 종단 테스트 한 줄씩 |
| 2026-11-05 | 가계부 S1g — FR-20 이야기 카드 done(`2c31ce55`). 도메인 테스트 +8(69) · 종단 +1(31) · 쿼리 6. 범위를 다시 나눴다 — 사람 장부 · 리볼빙은 S1h · 옛 "S1g" 포인터 정정 · 주석 `MonthClose.kt`(`ef543fd4`) |
