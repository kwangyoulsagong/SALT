# SRV-REQ-021 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 2

- 경로 다섯 실호출(4020) · 토큰 없음 401 · Swagger `failOnErrors` 시험 통과(`swagger.test.ts`) · 응답 p95 weekly 2.7ms · settings 1.4ms · monthly 1.6ms(20회)
- 미충족: BFF 짝 · 화면(순서 3)

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 2 | 대체 · 충족 | `trackRecordId` 대신 `renderable` + `blockedReason`(머리 블록) — 늘 담긴다(`application/api/views.ts`) |
| FR-3 | 충족 | 게이트 닫힘도 200 |
| FR-4 | 충족 | `reasonCode` · `blockedReason` · 김프 `level` 은 코드 |
| FR-5 · 6 · 8 | 대체 | Puell · `staleDays` · `excluded` 없음(머리 블록) — 대신 `fallback` · `band_pending` |
| FR-7 | 충족 | 김프 `null` 이어도 금액 유효 — 시험 `domain/__tests__/plan.test.ts:260` |
| FR-9 · 10 | 충족 | 1,000원 단위 · 배수 0~3(DB CHECK `20261119300100_plan_weekly/migration.sql:47-48`) |
| FR-11 · 20 | 충족 | 다음 주부터 · 첫 저장 즉시(`application/UpdatePlanSettings.ts:32-46`) |
| FR-12 · 25 | 충족 | 다시 체크는 한 행 갱신 · 같은 값 재저장은 쓰기 0(체크리스트 2회차 동시 요청) |
| FR-13 | 대체 | track-record 경로가 없다(머리 블록) |
| FR-14 | 충족 | 0배 = `amountKrw: 0` |
| FR-15 | 충족 | Swagger `presentation/plan.routes.ts:146~293` · `swagger.test.ts`(failOnErrors) |
| FR-21 · 22 | 충족 | `presentation/dto/plan.dto.ts:6`(`.strict()` — 모르는 키 400) · 밴드 키 422 가 먼저(`presentation/plan.controller.ts:40`) |
| FR-23 | 충족 | v2 모양 — `GET /settings` · `GET /weekly` 둘 다 200 `configured: false`(404 `PLAN_NOT_READY` 대신) |
| FR-24 | 충족 | `editable: false` 리터럴 |
| FR-26 | 충족 | `domain/policy/execution.ts:10` · 422 `PLAN_EXECUTION_INVALID` |
| FR-27 · 28 | 충족 | `domain/policy/monthlySummary.ts:23` · 계획 0 → `progressPct: null` |
| FR-29 | 충족(2026-11-19 고침) | 형식은 DTO(`presentation/dto/plan.dto.ts`) · 오지 않은 달은 `application/GetMonthlySummary.ts` 가 KST 오늘 달과 비교해 `PlanMonthInFutureError`(400 `PLAN_MONTH_IN_FUTURE` · `currentMonth`). 시험 `planUseCases.test.ts` — 이번 · 지난 달 200 · 다음 달 · 내년 400 · KST 월 경계(11-30T15:00Z = 12월) · 변이(거절 줄 빼면 실패) · Swagger 400 사유 |

경로 다섯 p95(루트 슬라이스) — weekly 2.9 · settings 0.7 / PATCH 7.1 · complete 5.0 · monthly 1.0ms.

남은 것: 없음(FR-29 를 같은 날 고침).

## 2026-11-26 — 서버 S4a 밴드 적립 → Kotlin portfolio(`MONEY-S4a-portfolio-plan`, `feat/srv-req-049-s4-portfolio`)

- 파일만 걸침 — plan 유스케이스가 옮겨 간 자리. 검증은 루트 체크리스트(`./gradlew check` · Express · BFF 시험)
- 미검증: 없음(이 몫 안)
