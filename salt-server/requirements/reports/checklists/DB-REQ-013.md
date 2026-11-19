# DB-REQ-013 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 1(`feat/f003-v2-s1-band-forecast`)

- `20261119200000_forecast_accumulation_band` 로컬 `migrate deploy` · CHECK 넷(자산 · 지표 · 밴드 · 사유) + 관문 실패면 배수 1.0 · 뷰 조회 Index Scan(버퍼 6)
- 미충족: 사람 표 둘(설정 · 실행 기록) — 순서 2

## 2026-11-19 F003 v2 순서 2

- `20261119300000` · `20261119300100` 로컬 `migrate deploy` · `prisma migrate diff`(그림자 DB) 내 표 차이 0 · 등급 주석(financial) 둘
- `EXPLAIN (ANALYZE, BUFFERS)` 사람 행 목록 Index Scan 0.05ms · 주별 뷰 0.12ms(표 2행 — 순차 읽기)
- 미충족: 없음

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 15 | 충족 | v2 모양 — `plan_settings` 사람마다 한 행 · `monthly_base_krw` 원값 · 이전 값 · 반영 주(`prisma/migrations/20261119300100_plan_weekly/migration.sql:16-22`). 자산별 행 · `bandPresetKey` 없음(배분은 설정값) |
| FR-2 · 13 · 14 | 대체 | `BandPreset` 이 없다 — 예측 행 `bands` + 실행 행 `prereg_key` 스냅샷 |
| FR-3~7 | 대체 | `IndicatorSnapshot` · `IndicatorTrackRecord` · GIN → `forecast.accumulation_band`(`20261119200000_forecast_accumulation_band`) |
| FR-8 · 9 | 충족 | 유일 키(`:56`) · 월요일 CHECK(`:46`) — `symbol` 대신 `asset` |
| FR-10 | 충족 | 지표 값 · 관문 · `fallback` 스냅샷 열(`weekly_plan_executions`) |
| FR-11 | 대체 | 2026-09-21 개정(원장 매칭 없음) |
| FR-12 | 충족 | 사람 표 둘 `user_id` 참조 |
| FR-16 | 충족 | `src/plan/domain/policy/monthlySummary.ts:23` |

미충족 — 없음
