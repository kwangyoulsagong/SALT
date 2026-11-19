# DB-REQ-015 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 | 대체 | 추가만 하는 마이그레이션 셋 — `20261119200000_forecast_accumulation_band` · `20261119300000_forecast_accumulation_band_week` · `20261119300100_plan_weekly` |
| FR-2 · 5 | 대체 | GIN · "M2 가 F004 보다 먼저" — 10-29 정정 블록 |
| FR-3 | 충족 | `weekly_plan_executions_multiplier` CHECK 0~3 — `prisma/migrations/20261119300100_plan_weekly/migration.sql:47` |
| FR-4 | 충족 | drop 없음 — 셋 다 추가만 |
| FR-10~16 | 대체 | `IndicatorTrackRecord` 시드가 없다 — 성적 · 실패 사례는 예측이 사전등록 규칙으로 뽑는다(`FC-REQ-029`, `FE-REQ-022` 머리 블록 "v1 시드 안 씀") |
| FR-17 | 충족 | 근거 없이 만든 사례 0 — 사례는 규칙 산출뿐(`salt-forecast/src/salt_forecast/domain/accumulation.py:307-308`) |
| FR-20 · 23 | 충족 | 첫 저장이 사람 행을 만든다 — `src/plan/application/UpdatePlanSettings.ts:35-43` · `ON CONFLICT (user_id)`(`infrastructure/PrismaPlanSettingsStore.ts:32`) |
| FR-21 · 25 | 대체 | `BandPreset` 이 없다 — 밴드는 사전등록 `bands`(예측 행), 바꾸면 사전등록 판이 오른다(`@2`, 글로벌 플랜 판단 1) |
| FR-22 | 대체 | CAPE 범위 밖(글로벌 플랜 범위 밖 표) |
| FR-24 | 대체 | 국내는 코스피 지수로 대상이 됐다(글로벌 플랜) · `excluded` 폐기 |
| FR-30~32 | 대체 | 백필은 `FC-REQ-029` — BTC 2014~ · 코스피 2006~ 원천 수집 |

수용 기준 `prisma migrate status` clean — `DB-REQ-013` 체크리스트(로컬 `migrate deploy` · 그림자 DB 차이 0).

미충족 — 없음
