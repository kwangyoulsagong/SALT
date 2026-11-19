# DB-REQ-014 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 2

- CHECK 다섯(자산 · 월요일 · 배수 · 금액 · 상태 한 덩어리) · 유일 키 + `ON CONFLICT DO NOTHING` — 메모리 가짜와 실 DB 둘 다에서 두 번째 읽기 쓰기 0
- 미충족: 없음

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| INV-1 · FR-1~5 | 대체 | 지표 멱등 수집은 예측(`FC-REQ-029`) |
| INV-2 · 3 · FR-10~12 | 충족 | 유일 키 · 월요일 CHECK · `ON CONFLICT DO NOTHING`(`prisma/migrations/20261119300100_plan_weekly/migration.sql:46 · 56`) |
| FR-13 · 14 | 충족 | 수동 체크만 · `executed_krw` · `recorded_at`(status CHECK `:50`) |
| INV-4 · FR-20 · 21 · 24 | 충족 | v2 모양 — `trackRecordId` 대신 3종 게이트(`src/plan/domain/policy/bandCard.ts:12`) · 차단은 오류가 아니다 |
| FR-22 · 23 | 대체 | v1 시드 · `signalTypes` 없음(10-29 정정 · `FE-REQ-022` 머리 블록) |
| INV-5 · FR-30 | 충족 | CHECK `:47` |
| FR-31 | 대체 | CAPE 없음 — 코스피 하한은 사전등록 밴드 |
| INV-6 · FR-32~34 | 충족 | v2 모양 — 그 주 예측 행 없음 → 1.0 + `fallback`(`domain/policy/weekPlan.ts:15`) |
| FR-35 | 충족 | 0배 = 금액 0 |
| INV-7 · 11 · FR-40 · 41 · 43~45 | 충족 | 월 적립액만 사용자 값 · 1,000원 CHECK(`:16`) · 환산 서버 한 곳(`domain/policy/amount.ts:35`) · 다음 주부터 · 첫 저장 즉시 |
| FR-42 · 46 | 대체 | `BandPreset` 시드 없음 — 사전등록 `bands` |
| INV-8 · FR-50~52 | 충족 | 처음 스냅샷을 `ON CONFLICT DO NOTHING` 으로 지킨다(`infrastructure/PrismaExecutionStore.ts:56`) |
| INV-9 · FR-60~63 | 충족 | `skipped` · 코드만 · 점수 0(`domain/policy/execution.ts:31`) |
| INV-10 · FR-70~73 | 충족 | `domain/policy/monthlySummary.ts:23` |

미충족 — 없음
