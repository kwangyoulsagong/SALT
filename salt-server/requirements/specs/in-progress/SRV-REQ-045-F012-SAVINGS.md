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

**2026-11-03 S1b 로 생긴 것**: `PUT /api/savings/goals/plans`(저울 확정) · `POST /api/savings/goals/:id/emergency-compare` · `POST /api/savings/goals/:id/units` · `DELETE /api/savings/goals/:id/units/:unitId`. 목록 · 상세 응답 칸 `scene` · `stampCount` · `postcard` · `unitLine` · `planMeetsDeadline` · 상세 `missedMonths` · `units` · `unitLimit`. 아직 없음: ~~`delay`(가계부 S1)~~ **정정 2026-11-04** — 목록 칸이 아니라 따로 `GET /api/savings/goal-clock?amount=`(가계부 S1a `a16356f6`) · `members`(공동)

## 진행 — S1a (2026-11-03, 슬라이스 `requirements/specs/done/MONEY-S1a-savings-calculator-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 | **정정 2026-11-03** — ~~골든 녹화 → Kotlin 구현 → 그림자 → 스위치~~ 옛 `/api/goals*` 는 다시 만들지 않고 **은퇴**(BFF 410). 데이터는 관리자 SQL 로 가져오기(`salt-platform/db/savings-import.sql`), 소비처 셋(셸 화면 · 홈 카드 · 온보딩 프로브)을 같은 슬라이스에서 옮겼다 — 쓰기 경로가 둘인 기간 0. 옛 Express 코드 삭제는 1주 관찰 뒤 | `e83f7f80` · `1ec3b0c6` · `3e5e0d42` |
| FR-2 | 부분 — 템플릿 7종. 기준선은 원문 대조 전이라 **금액을 내리지 않는다**(`baseline: null` + `baselineReason: unverified_source`) | `ListTemplates` |
| FR-3 | done — 기한 → 월 적립(원 단위 올림) · 월 적립 → 도달 월 · 세후 단리(15.4% 상수, FR-13 사본 전) · 경계(기한 이번 달 · 지남 · 0 · 달성 · 100년) + 저장 없는 `POST /api/savings/calculate`(스펙 API 목록 밖 — 만들기 화면 디바운스 자리) | `SavingsMath` · `Calculate` |
| FR-4 | done — 단건 · 나눠 넣기(합계 = 나눈 합, 같은 목표 두 번 거부, 2개 이상) · 목표 행 잠금(id 순) | `RecordDeposits` |
| FR-5 | done — 다 찬 달 3개월 이상: 월 적립 10 · 90% 분위 → 늦은 · 빠른 끝(빈 달 0 · 이번 달 제외 · 가져온 잔액 제외), 미만 `plan_only` + 이유. 늦은 끝이 없으면 하위 10% 0 → `slow_side_open`, 아니면 `not_reachable`(2026-11-03 `2207c02b`). 만들기 · 적립 때만 `projection_issued` + `savings.ProjectionIssued` | `ProjectionEngine` · `ProjectionIssuer` |
| FR-6 | 부분 — 채점 사본 없음 → `track: null` + `trackReason: history_short` 늘 | `FC-REQ-024` 뒤 |
| FR-8 | done — 이번 달 넣은 돈 · 계획 · 차이 · 상태 키(`no_plan` · `under_plan` · `plan_met`). 서버 문장 0(키만) | `Milestone` |
| FR-9 | done — `frame` saved/remaining(50%) | `Frame` |
| FR-15 | done — `GET /api/savings/home-card` 숫자(목표 수 · 진행 중 · 모은 돈 · 진척 최대 진행 중 목표). 포맷은 BFF 카드 계약 | `HomeCard` |
| FR-18 | 부분 — `GoalCreated` · `GoalReached`(목표마다 한 번) · `ProjectionIssued` 계약 3 + 발행(2026-11-03 `531fdf35`: reason 에 `not_reachable`). 구독자 없음(S2 · `FC-REQ-024`) | `contracts/events/savings.*` |
| FR-19 | done — 목록 쿼리 3회(테스트가 jOOQ 리스너로 센다) | `SavingsEndToEndTest` |
| FR-7 · 10~14 · 16 · 17 | S1b · 뒤 — 저울 · 오늘 돈 · 놓친 달 · 비상시 · 제도 파라미터 · 공동 목표 · 재미 상태 · 가계부 구독 — **2026-11-03 S1b 가 FR-7 · 11 · 12 · 16 을 가져감(아래 표)** | 루트 슬라이스 범위 밖 |

## 진행 — S1b (2026-11-03, 슬라이스 `requirements/specs/done/MONEY-S1b-savings-fun-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-7 | done — `POST /api/savings/simulate`(저장 없음 · 진행 중 목표만 · 바꾸지 않은 목표도 행으로 · 합계 전후) + 확정 `PUT /api/savings/goals/plans`(스펙 API 목록 밖 — "확정할 때만 저장" 자리, 잠금 UUID 순 · 바뀐 목표마다 구간 재발행). 모형: 표본마다 Δ(판단 1). 기한 목표는 막지 않고 `afterMeetsDeadline` · `planMeetsDeadline` 사실(리뷰) | `Simulation` · `SimulateBalance` · `UpdateMonthlyPlans` |
| FR-11 | done — 건너뛴 달 수 · 계획 도달 이동 **달**(~~일수~~ **정정 2026-11-03**: 구간이 달 단위). 만든 달은 넣었을 때만 센다(리뷰). 멈춘 기간은 이력이 없어 못 뺀다 — 멈춤 경로가 아직 없다 | `MissedMonths` |
| FR-12 | done — `POST /api/savings/goals/:id/emergency-compare`: 꺼내기(계획 도달 이동 달 · 모은 돈 이하) vs 원리금 균등(~~상환 원 단위 올림~~ · ~~이자 = 올린 상환 × n − 원금~~ ~~**정정 `4fda31db`: 이자 = 정확값 · `lastPayment` 가 차액, 작은 금액은 `EMERGENCY_AMOUNT_TOO_SMALL`**~~ **재정정 2026-11-03: 총액(원금 + 정확 이자)을 n 달에 원 단위로 나눔 — 처음 k개월 +1원, 총액 < 달 수면 대출 칸만 null(`af797be0`) · 반올림은 총액 하나에 한 번 · 소수 원금 거절(`4a70e515`)**) + 가정 키 `loan_paid_outside_goal`. 범위는 도메인 사유 코드(`EMERGENCY_*`) | `EmergencyComparison` · `CompareEmergency` |
| FR-16 | 부분 — 장면 단계(템플릿 5종 · 10칸 내림) · 실물 환산(사용자 단위 · 목표당 3 · 내림, `POST/DELETE /goals/:id/units`) · 도장(1 + 직접 넣은 적립) · 엽서(걸린 일수 · 적립 횟수). **템플릿 단위 · 엽서 사진은 뒤** | `Fun.kt` · `AddItemUnit` · `DeleteItemUnit` |
| FR-19 | done(유지) — 목록 쿼리 **3회**(목표 · 집계+월별 한 문장 · 단위). 단위를 붙이며 4회가 됐다가 `overviewByGoal` 로 되돌림 · 홈 카드는 단위를 읽지 않는다(2회 + 목표) | `SavingsEndToEndTest` |
| FR-10 · 13 · 14 · 17 · FR-6 채점 | 범위 밖 — 물가 원천 · `content` S2 · identity S3 · ~~가계부 S1~~ **정정 2026-11-04** FR-17 은 조회만 닫힘(`a16356f6`), 구독은 가계부 S1b · `FC-REQ-024` | 루트 슬라이스 범위 밖 |

## Acceptance Criteria

- [x] ~~기존 goals 경로 골든 JSON 그림자 비교 차이 0 → 스위치~~ **정정 2026-11-03**: 옛 경로 은퇴 + 가져오기 대조(행 수 · 적립 합) — FR-1 행
- [x] 계산 경계 테스트(기한 지남 · 0 · 달성 · 이자 포함/제외) — `SavingsMathSpec` 10 · S1b 경계 `SavingsFunSpec` 12(장면 · 도장 · 엽서 · 단위 · 놓친 달 · 비상시 · 저울 · 기한)
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
| 2026-11-03 | `d69c310e` — FR-1 ⑦: 옛 Express goals 모듈 · Prisma 모델 삭제 + 표 drop 마이그레이션(덤프 · 복원 시험). 남은 호출 0 을 직접 확인(코드 grep · BFF 410 로그)해 1주 관찰을 당겼다. **로컬 DB 적용(`prisma migrate deploy`)은 권한에서 막혀 사용자 실행** |
| 2026-11-03 | 로컬 DB 에 `20261103120000_drop_legacy_goals` 적용(사용자 허용) — `public.goals` · `saving_transactions` 없음, `savings.goal` 그대로 |
| 2026-11-03 | MONEY-S1b — `9a435627` FR-7 · 11 · 12 done · FR-16 부분 · 경로 4(확정 · 비상시 · 단위 둘) · Flyway V2. `34815177` 리뷰(high) 서버 몫 8건: 기한 판정 · 비상시 사유 코드 · 상환 이자 일치 · 만든 달 · 잠근 뒤 읽기 · 단위 쿼리 user_id · 홈 카드 단위 안 읽음 · 집계 세 벌 → 두 벌. FR-11 "일수" → 달 정정. FR-19 3회 유지 |
| 2026-11-03 | MONEY-S1b 셸 경유 실측 — `4fda31db` FR-12: 금리 0% 에 이자 8원(리뷰 수정의 부작용) → 이자 정확값 · `lastPayment` · 작은 금액 사유 코드. 도메인 테스트 +3 단언 · 종단 `lastPayment` |
| 2026-11-03 | MONEY-S1b 리뷰(high, `4fda31db..`) 8건 — `af797be0` FR-12 대출을 "총액을 n 달에 나눔"으로 다시(나머지에 따라 거절 · 1개월 두 금액 · 대출 실패가 꺼내기를 지움 · 꼬리 오차 · 변환 방식 섞임). `loan` nullable + `loanReason` |
| 2026-11-03 | MONEY-S1b 리뷰(high, 3차 `af797be0..9f74c874`) 7건 중 6건 수정 — `44bc6a70` 이자 한 번 반올림 · `loanReason` · 가정 키를 도메인에서 파생 · `Loan` 분기 하나~~(총액 반올림은 유지: 원금 1000.5원 테스트)~~ **→ 4차 `4a70e515` 에서 소수 원금은 입구에서 거절로 바뀜** · `520b4d8f` BFF 대출 없음 응답 테스트 · `6f90828c` 화면 중립 대체 문구 · `023dc515` 규칙 `kotlin-platform.md` §3 예외(원 단위로 내는 계획 금액) 한 줄. ~~1건(총액 반올림 무의미)은 사실이 아님 — 원금이 원 단위가 아닐 수 있다~~ **→ 4차에서 소수 원금을 거절해 그 근거는 없어졌다(총액 반올림은 "총액에서 한 번" 규칙으로 남는다)** |
| 2026-11-03 | MONEY-S1b 리뷰(high, 4차 `9f74c874..023dc515`) 9건 — `4a70e515` 반올림은 총액에서 한 번(3차 수정이 X.5원 꼬리 오차를 되살려 1원 모자람 — jshell 재현 · 변이 시험으로 경계 테스트 확인) · 소수 원금 `EMERGENCY_AMOUNT_INVALID` · `loanReason` 저장 + init 배타 검사 · 분할 결정 한 곳 · `d4f948a4` 화면 대체 문구 두 곳 `||`. 문서 낡은 문장(FR-12 "상환 원 단위 올림") 정정 |
| 2026-11-03 | MONEY-S1b 리뷰(high, 5차 `023dc515..d4f948a4`) 10건 — `938bac10` 원 단위 아님 코드 분리(`EMERGENCY_AMOUNT_NOT_WHOLE`) · 꺼내기 100년 못 닿음 `not_reachable`(옛 slow_side_open 오표시) · 60자리 계산 · 30자리 꼬리 정리 · 생성자 private + Withdraw 배타 검사 · 꼬리 0 허용 테스트 · `0e8c0f05` 원 단위 입력(점 뒤 버림 — 점만 지우면 1000.5 가 10,005, 실측) · 대체 문구 헬퍼 · `11e1e60c` 규칙 한 줄(꼬리 정리는 금액 반올림 아님) |
| 2026-11-03 | MONEY-S1b 리뷰(high, 6차 `d4f948a4..11e1e60c`) 9건 — `2207c02b` 다 찬 목표 꺼내기 이동 0("1개월 늦어져요" 결함) · 늦은 쪽이 없는 이유를 구간(S1a `ProjectionEngine`)도 0 이면 slow_side_open · 아니면 not_reachable · 놓친 달도 100년 못 닿으면 not_reachable · 배타 검사 require · data class 유지(copy private) · `6395cf82` BFF 이유 주석 · `e0a0961b` 금액 칸 점 든 입력 무시(점 뒤 버리기 = 12.,345 → 12 손실) · `labelOr` 자기 키만. 반올림 1건은 유한 정밀도의 한계라 주석으로(정확한 X.5 를 맞히는 쪽) |
| 2026-11-03 | MONEY-S1b 리뷰(high, 7차 `11e1e60c..e0a0961b`) 10건 — **`531fdf35` 이벤트 계약 `savings.ProjectionIssued` reason 에 `not_reachable`**(6차가 더한 값을 계약이 막아 그런 목표의 적립 · 확정 · 만들기가 500 이었다 — 종단 테스트 + 변이 시험) · `fba0e7c9` 놓친 달 실패는 그 칸만 degraded · 배타 검사 check 통일 · KDoc · `68f6ac41` 키 조회 헬퍼 `labelOr` 를 entities 로(전 조회처) · not_reachable 중립 문구 · 전각 소수점 거절 · 거절 안내 · 놓친 달 degraded 문구 |
| 2026-11-03 | MONEY-S1b 리뷰(high, 8차 `e0a0961b..68f6ac41`) 9건 — `cdeb5f7c` 공용 `readAmountInput`(허용 목록 · NFKC) · `useAmountInputGuard` · `labelOr` 를 web-shared 로(hasOwn → hasOwnProperty.call, iOS 15.0~15.3) · `ac23eaaf` 저축 금액 칸 전부 + 안내 · 남은 키 조회 · `5640ae7f` 놓친 달 실패 로그(System.Logger) · 응답 degraded 반영 · 종단 쿼리 카운터가 릴레이 문장 제외(타이밍 3 → 6 플레이키) |
| 2026-11-03 | MONEY-S1b 리뷰(high, 9차 `68f6ac41..5640ae7f`) 10건 — 표 먼저: `641a11db` core `readNumberText`(원 · 소수 · 개수) 허용표 테스트 40(공백 · 위첨자 · 원문자 · 쉼표 소수 · 개월 1.5 · ₩/원 붙여넣기) · `92b0e947` 칸 종류별 안내 · 제출 때 안내 초기화 · 개월 칸 · `b10c9a74` 상세 degraded 는 응답 최상위(goal 칸은 목록과 같은 모양) · 카운터는 요청 스레드만. 투자 칸 1건은 범위 밖(동결) |
| 2026-11-03 | MONEY-S1b 리뷰(high, 10차 `5640ae7f..b10c9a74`) 9건 + 사용자 "고칠 거면 제대로" — `bd571eae` core `price` 규칙 · `groupDigits` 한 곳(2^53 넘어도 끝자리 그대로) · 끝 % 공백/전각 · `d21bd5c1` 가드 칸별 안내 · `c786ab91` 저축 칸 이름 · 상한 때 안내 지움 · **`7d22f6a1` 투자 금액 칸 4곳도 같은 규칙(사용자 결정 2026-11-03)** · `38823672` 상세 부분 실패 단위 테스트(application 첫 테스트) · 카운터는 헤더 요청만. 쉼표 위치 1건은 지우기 중 정상적으로 생겨 받는다(주석) |
| 2026-11-03 | MONEY-S1b 리뷰(high, 11차 `b10c9a74..38823672`) 10건 — 원인: 안내만 쥐던 가드라 값을 바꾸는 길(칩 · 현재가 · 숨김 · 비우기)마다 손으로 지워야 했다. `5afe2476` core 길이 상한(정수 15 · 소수 8 — 보이는 값 = 보내는 값) · `numberToInputText`(1.2e-7 → "1.27" 경로 닫음, 테스트 75) · `5fd864d1` **`useNumberFields`(값과 안내 한 덩어리, BREAKING: 가드 제거)** · `e8fe98fe` 저축 6폼 · `2bcea756` 투자 3폼(칩 · 현재가 · 저장된 소수 예산) · `97c839f3` degraded 이유 한 곳 · 테스트 필터 순서. 화면에서 리뷰 사례 전부 재현 확인 |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — FR-17 일부 — 가계부 응답용 조회 `GET /api/savings/goal-clock?amount=`(가장 가까운 목표 · 계획 월 적립 또는 기한 기준 재계산 월 적립 · 지연 일 = 금액 × 30.4375 ÷ 월 적립, 반올림 1회)(`a16356f6`). 구독(`ExpenseRecorded` 재계산 · `MonthClosed` 속도)은 가계부 S1b |
| 2026-11-04 | 가계부 S1a 리뷰 반영 `85512af5` — goal-clock 금액 상한 10억(넘치면 400 `CLOCK_AMOUNT_INVALID` — 전엔 Long 넘침 500) |
| 2026-11-04 | 가계부 S1d(`MONEY-S1d-household-challenge`) — FR-17 일부 — 챌린지 아낀 돈 보태기 `POST /api/savings/goals/:id/challenge-deposits`(출처 `saved_by_challenge` · `source_ref` = 아낀 돈 id — 하나에 한 번, 같은 목표 재시도는 새로 쓰지 않고 지금 상세 · 다른 목표 · 다른 사용자 409 `DEPOSIT_SOURCE_USED`). 손 적립 · 나눠 넣기와 같은 길(`RecordDeposits.record` — 잠금 · 달성 · 구간 발행)(`8d0e2723`) |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`) — 이 REQ 에 걸린 몫: `savings.GoalCreated` · `GoalReached` 의 첫 구독자 content(금융 팁 S2a) — 저축 코드 · 계약 무변경 |
| 2026-11-05 | 금융 팁 S2d(루트 `requirements/specs/done/MONEY-S2d-tips-my-numbers-slice.md`) — 이 REQ 에 걸린 몫: **계약 무변경 · 새 소비자** — BFF 금융 팁 내 숫자가 `GET /api/savings/goals` 를 읽는다(template · status · saved · monthlyPlan · targetDate 만, 이름 · id 는 넘기지 않음). 저축 코드 변경 0 |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): 파일만 걸침 — `ops/run-platform.sh` 에 계정 둘(LOCAL_DB_NOTIFICATION · COACH) |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): `GET /api/savings/goals/exists`(온보딩 `set_plan` 프로브) 삭제 — 소비처 = 은퇴한 Express 온보딩 하나. `HasGoals` · `Goals.existsFor` · 테스트 두 줄 `7f2ba1ed` |
| 2026-11-06 | 파일만 걸침(F016 단계 B) — `ops/salt.sh`(머리에 이 REQ) 신선도 쿼리에 국내 시황 제목 · 프로그램 · 업종 세 줄(`OPS-002`, `SRV-REQ-051` FR-12). 저축 무변경. 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md` |
| 2026-11-09 | `ops/salt.sh status` 신선도 두 줄 — 국내 지수 일별(4일 넘으면 ✗) · 등락 분해 β as_of(3일 넘으면 ✗, 서버가 7일에 버리기 전). F016 단계 C `SRV-REQ-051` FR-12 |
| 2026-11-11 | `feat/f017-s1c-collection`: `ops/salt.sh` `status` 아래 수집 점검(`OPS-003`) — 쿼리 `ops/collection-status.sql` · 결함 주입 시험. 저축 서비스 기동 · 이름 표 변경 0 |
