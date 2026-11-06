# SRV-REQ-045 — 체크리스트

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 정정 | 옛 경로 은퇴 + 가져오기 SQL + 온보딩 프로브 → 내부 REST | 가져오기 일회용 DB 왕복(재실행 같음 · 되돌리기) · 로컬 운영 DB 1 → 1 · 프로브 실측 done true / false |
| FR-2 | `ListTemplates` 7 · 기준선 null | 종단 테스트 |
| FR-3 | `SavingsMath` · `Calculate` · `POST /calculate` | `SavingsMathSpec` 10(12M/12달 → 100만 · 올림 · 3% 세후 986,439 · 이자 162,732 · 기한 이번 달/지남 · 달성 · 34달 · 이자 있으면 빨라짐 · 100년) · 종단(400 형식 · 이율 필수 · 저장 0) |
| FR-4 | `RecordDeposits` 잠금 | 종단 — 달성 한 번 · 동시 두 건 달성 한 번 · 합계 불일치 400 · 실패 요청 흔적 0 |
| FR-5 | `ProjectionEngine` | `ProjectionSpec` 5(history_short · 분위 0.32M/1.12M → 2028-11 · 늦은 쪽 열림 · 달성) · 종단(발행 4회) |
| FR-6 | `trackReason` | 종단 |
| FR-8 · 9 | `Milestone` · `Frame` | spec · 종단 |
| FR-15 | `HomeCard` | 종단(진척 최대 · 목표 없으면 null) · BFF 테스트 · 실스택 홈 카드 |
| FR-18 | 아웃박스 3종 | 종단(같은 트랜잭션 두 행) · 로컬 실측 published_at 채워짐(브로커 전송) |
| FR-19 | 쿼리 3회 | 종단(jOOQ 실행 리스너) |
| 남의 목표 | 404(읽기 · 적립 · 나눠 넣기) | 종단 |
| 권한 | svc_savings ↔ svc_ping 서로 42501 | 종단 |

미충족 · 범위 밖은 스펙 진행 표 — ~~S1b(FR-7 · 10~14 · 16 · 17)~~ **정정 2026-11-03: S1b 가 FR-7 · 11 · 12 · 16 을 닫음, 남은 FR-10 · 13 · 14 · 17 은 `MONEY-S1b` 범위 밖 표** · `FC-REQ-024`(FR-6 사본) · 옛 Express goals 삭제(1주 관찰 뒤).

- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — 미검증 닫기

- FR-5 `degraded`(`2c998117`): `DegradedProjectionSpec` 2(실패 주입 → plan 2027-11 · reason degraded / 실패 없으면 그대로) · 종단 `degraded:false` · 쓰기 경로는 실패 구간 발행 0
- platform launchd 상시: `ops/salt.sh up` 재시도도 권한(영속 프로세스 등록)에서 막힘 — 사용자 실행

## 2026-11-03 — 코드 리뷰(high) 10건 `c82be47c`

- 코드 리뷰 10건 중 9건(①~⑨) `c82be47c`. FR-5 정정: ~~발행 기록을 화면이 읽는다~~ 조회는 늘 지금 기준 재계산 · 응답 `projection.issuedAt` 제거. 경로 하나 추가 `GET /api/savings/goals/exists`
- 검증: Kotlin 종단 10(대소문자 중복 400 · 목록 = 상세 구간 · exists) · 도메인 19 · 경계 8 · 플랫폼 14 · 서버 936 · BFF 351 · 모노레포 check-types · lint · test · web-savings 빌드 · 훅 사후 · 실스택(프로브 done true/false)

## 2026-11-03 — MONEY-S1a 대조 빈칸(파일에 함께 적힌 REQ)

- `c60f5bfb` — 웹 만들기 · 적립 요청 타입이 서버 DTO 이름을 따른다. 서버 무변경
- 확인: 해당 영역 전체 테스트 · 빌드(루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`)

## 2026-11-03 — 사용자 "그것도 다 니가해": launchd 상시 · 옛 Express goals 삭제

- `d69c310e` — FR-1 ⑦: 옛 Express goals 모듈 · Prisma 모델 삭제 + 표 drop 마이그레이션(덤프 · 복원 시험). 남은 호출 0 을 직접 확인(코드 grep · BFF 410 로그)해 1주 관찰을 당겼다. **로컬 DB 적용(`prisma migrate deploy`)은 권한에서 막혀 사용자 실행**
- 확인: 서버 build · lint · test 936 · test:layer-check · 재시작 health 200 · Express `/api/goals` 404 · BFF 410 · 온보딩 `set_plan` done · `ops/salt.sh status` 전부 ok

## 2026-11-03 — MONEY-S1b 저울 · 비상시 · 놓친 달 · 재미

| FR | 구현 | 검증 |
|---|---|---|
| FR-7 | `Simulation` · `SimulateBalance` · `UpdateMonthlyPlans` · `PUT /goals/plans` | 도메인: 올리면 당겨짐 · 내리면 늦은 쪽 열림 · 안 바꾼 목표 그대로 · 기한 판정. 종단: 저장 안 함 · 합계 · 이동 −10/+12 · 확정 뒤 구간 발행 +1 · 남의 목표 404 · 중복 400 · 기한 목표 `afterMeetsDeadline` / `planMeetsDeadline` false |
| FR-11 | `MissedMonths` | 2달 건너뜀 → 2달 · 계획 없음 · 다 찬 목표 · 만든 달 규칙 |
| FR-12 | `EmergencyComparison` · `CompareEmergency` | 상환 86,067 · ~~이자 32,804(계산기 값)~~ ~~**정정 `4fda31db`: 이자 32,797 · 마지막 달 86,060**~~ **재정정 `af797be0`: 이자 32,797 · 86,067 × 5 + 86,066 × 7** · 금리 0 · 모은 돈 초과 · 달 121 · 사유 코드가 VALIDATION 에 가리지 않음(종단) |
| FR-16 | `Fun.kt` · `AddItemUnit` · `DeleteItemUnit` · V2 | 장면 칸 0/3/9/10 · 도장 1 → 2 · 단위 2개 · 상한 409 · 남의 단위 404 · 엽서 일수 · 적립 수 |
| FR-19 | `overviewByGoal` | 목록 3회(jOOQ 리스너) · 목표 단위 집계와 값 대조 |

- `./gradlew check` 통과 — 저축 종단 13 · 도메인 31(Math 11 · Fun 12 · Projection 6 · Degraded 2) · 플랫폼 14 · ArchUnit 8. 실행 jar 로컬 운영 DB Flyway v2 적용 · health UP
- 실스택: BFF 4001 → platform 4010 → 로컬 DB(임시 사용자) — 경로 5 · 화면 3003 저울 확정 · 비상시 · 단위 · 적립 → 장면 한 칸
- 미충족: FR-10 · 13 · 14 · 17 · FR-6 채점 · FR-16 템플릿 단위 · 엽서 사진 — 루트 슬라이스 범위 밖 표
- 2026-11-03 셸 경유 실측 결함 `4fda31db`(→ **`af797be0` 로 다시 바꿈, 아래 줄**): ~~0% · 10만 · 12달 → 8,334 × 11 + 8,326 · 이자 0(도메인) · 6% 100만 12달 → 86,067 × 11 + 86,060 · 이자 32,797(종단). `./gradlew check` 통과 · 재배포 · 셸 경유 화면 "이자 합계 0원"~~
- 2026-11-03 `af797be0`(리뷰 high 8건): 총액 나눔 — 6% 100만 12달 86,067 × 5 + 86,066 × 7 · 0% 10만 12달 8,334 × 4 + 8,333 × 8 · 1달 100,010원 6% → 한 번에 100,510 · 7,200 / 7,201 / 10,001원 · 120달 모두 나뉨 · 1원 · 120달 → `loan: null` + `amount_too_small` + 꺼내기 그대로 + 가정 비움. `./gradlew check` 통과 · 재배포 · 화면 5경우
- 2026-11-03 `44bc6a70` — 도메인 +5 단언(파생 `loanReason` · `assumptions` · 1000.5원 분할) · `./gradlew check` 통과 · 재배포 · 화면 5경우 + 1000.5원 API
- 2026-11-03 `4a70e515` — X.5원 경계 6개(3% · 1~9천 원 · 0.3% · 2천 원 · 1달) · 소수 원금 거절 · 변이: 꼬리 정리 빼면 실패 / 되돌리면 통과 · `./gradlew check` · 재배포 · API 1,000원 3% 1달 → 이자 3 · 화면 5경우
- 2026-11-03 `938bac10` — 도메인: 1000.5 → NOT_WHOLE · 1000.00 · 1E+3 허용 · 1조 원 3% 1달 이자 25억 · 1,001원 3% → 3 · 먼 목표 꺼내기 not_reachable. `./gradlew check` 통과 · 재배포 · API(1000.5 → NOT_WHOLE, 1000.0 → 334 + 333 × 2) · 화면 "이 월 계획으로는 100년 안에 닿지 않아요"
- 2026-11-03 `2207c02b` — 도메인 +1 테스트(놓친 달 · 구간 not_reachable) + 다 찬 목표 꺼내기 0. `./gradlew check` 통과(도메인 Fun 13) · 재배포 · API 다 찬 목표 delayMonths 0
- 2026-11-03 `531fdf35` · `fba0e7c9` — 종단 +1(먼 목표 · 지난 3달 적립 → 적립 201 · reason not_reachable · ProjectionIssued 발행) · **변이: 계약에서 값을 빼면 그 테스트만 실패** · `./gradlew check` 통과(종단 14) · 재배포 · 실 스택 적립 201
- 2026-11-03 `5640ae7f` — `./gradlew check` 통과 · 종단 3회 연속 통과(카운터 정리 뒤) · 재배포
- 2026-11-03 `b10c9a74` — 상세 최상위 degraded false(정상) 실측 · 종단 14 · 강제 재실행 2회 통과 · 재배포
- 2026-11-03 `38823672` — application `GoalReaderSpec` 2(놓친 달 실패 주입 → 그 칸만 degraded · 이유 missed_months / 정상 → 이유 없음) · 종단 3회 연속(헤더 요청만 셈, 정확히 3)
- 2026-11-03 `97c839f3` — `./gradlew check` 통과(종단 14 · application 2) · 재배포

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] goal-clock 종단 테스트(목표 없음 `no_active_goal` · 30,000원 × 30.4375 ÷ 304,375 = 3일 · 금액 0 → 400) — `HouseholdEndToEndTest`
- [x] 실스택: 월 50만 원 계획 목표에 4,500원 → "하루도 안 늦어져요"(0.27일 반올림 0)
- [ ] 구독 2종 — 가계부 S1b

## 2026-11-04 — 가계부 S1d(`MONEY-S1d-household-challenge`)

- [x] `POST /goals/:id/challenge-deposits` — 출처 `saved_by_challenge` · 같은 아낀 돈 두 번 → 적립 1행 · 다른 목표 · 다른 사용자 409 `DEPOSIT_SOURCE_USED` · 손 적립 · 나눠 넣기와 같은 길(종단 — 가계부 테스트에서)
- [x] `GoalReaderSpec` 가짜 포트 갱신 · `./gradlew check` 통과 · Swagger 경로 확인

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: `savings.GoalCreated` · `GoalReached` 의 첫 구독자 content(금융 팁 S2a) — 저축 코드 · 계약 무변경
- 검증: 슬라이스 검증 그대로(`requirements/reports/checklists/MONEY-S2a-tips-content.md`) — 이 REQ 의 수용 기준은 바뀌지 않았다
- 미검증: 없음(이 몫 안)

## 2026-11-05 — 금융 팁 S2d(`MONEY-S2d-tips-my-numbers`)

- 몫: 계약 무변경 · 새 소비자(BFF 금융 팁 내 숫자가 `GET /api/savings/goals` 를 읽는다). 저축 코드 변경 0
- 검증: 실화면 — 임시 사용자 주거 목표 월 20만 → 내 숫자 2,400,000원 · 적립 120만 → 예금보호 1,200,000원(슬라이스 체크리스트)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 실행 스크립트 환경 변수 둘
- 검증: `ops/salt.sh restart platform` → health UP
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 저축 경로 · 테스트 나머지 그대로 · `./gradlew check` 통과
