# DB-REQ-016 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 | 대체 · 충족 | `(user_id, week_of DESC)` · 유일 키 · `plan_settings_user_id_key` 있음(`prisma/migrations/20261119300100_plan_weekly/migration.sql:22 · 56 · 57`). 스냅샷 · GIN · `(userId, status)` 는 대상 표 · 쿼리가 없다 |
| FR-2 | 충족 | `EXPLAIN (ANALYZE, BUFFERS)` — 루트 슬라이스 실측 · `DB-REQ-013` 체크리스트 |
| FR-3 | 대체 | 10-29 정정 블록 |
| FR-4 | 충족 | 새 인덱스 · 집계 표 0 — monthly p95 1.0ms |
| FR-10~13 | 충족 | 요청 시 외부 0 · 밴드 계산 0 · weekly p95 2.9ms. "주 1회 워커가 미리"는 읽을 때 채움으로 대체(`src/plan/application/lib/syncWeeks.ts:24`) |
| FR-20~23 | 대체 | 김프는 예측 배치 → 뷰 열. 실패 시 `null` · 금액 유지는 `src/plan/domain/policy/bandCard.ts:40-41` |
| FR-30 · 31 · 32 · 33 · 35 | 대체 | 지표 수집은 `FC-REQ-029` · 주 생성은 읽을 때 멱등 채움(`ON CONFLICT DO NOTHING`, `infrastructure/PrismaExecutionStore.ts:56`) |
| FR-34 | 충족 | 지난 주 `planned` → `skipped` 한 문장 — `PrismaExecutionStore.ts:70` |
| FR-40 · 41 | 충족 | 사람 표 둘은 갱신이 드물다 · 스냅샷 표는 없다 |
| FR-50 | 대체 | 밴드 표는 예측 행 `bands`(`SRV-REQ-022` 머리 블록) |
| FR-51 | 충족 | 실패 사례 3건 + 수 |
| FR-52 | 대체 | 누적액(`streak.cumulativeKrw`) 때문에 시작 주부터 읽는다(`syncWeeks.ts:30`) — 1인 1년 104행 · Seq Scan 0.08~0.15ms |

수용 기준 "`PortfolioTransaction` 조회 0" — `src/plan` grep 0.

미충족 — 없음
