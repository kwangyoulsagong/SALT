# SRV-REQ-023 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 2 | 충족 | plan 에 외부 호출 0(grep `fetch(` · `axios`) · 밴드 계산 0 — 예측 뷰 읽기(`src/plan/infrastructure/PrismaBandReader.ts:108 · 113`) |
| FR-3 | 측정 충족 | weekly 서버 p50 1.3 / p95 2.9ms(예산 250ms) · 쿼리 5 |
| FR-4 | 충족 | 자산마다 최신 = 뷰 한 번(`PrismaBandReader.ts:108`) — N+1 0 |
| FR-5 | 대체 | `indicator` 컨텍스트가 없다 — 성적 · 실패 사례가 같은 예측 행(`SRV-REQ-022` 머리 블록) |
| FR-10~13 · 15 | 대체 | 김프는 예측 배치가 저장하고 뷰 열로 온다 — 서버에 인메모리 캐시 · 3소스 병렬 · 1s 타임아웃 대상이 없다 |
| FR-14 | 충족 | 김프가 없거나 오래되면 `null` · 금액 유지 — `src/plan/domain/policy/bandCard.ts:40-41` · 시험 `domain/__tests__/plan.test.ts:260` |
| FR-20~22 · 25 · 26 | 대체 | 서버 지표 워커가 없다 — `FC-REQ-029`(예측 배치 · `job_run` 이 실행 시간을 남긴다) |
| FR-23 · 24 | 대체 · 충족 | 월요일 워커 대신 읽을 때 채움(`SRV-REQ-020` 머리 블록) — 지난 주 마감은 사용자 루프 없이 한 문장(`infrastructure/PrismaExecutionStore.ts:56 · 70`) |
| FR-27 | 측정 충족 | 첫 저장도 같은 유스케이스(`application/UpdatePlanSettings.ts:32-46`) · 외부 호출 0. 첫 PATCH 는 따로 재지 않고 반복 PATCH p95 7.1ms(쿼리 6)로 대신했다 — 첫 저장은 이번 주 행 넣기 한 문장이 더해질 뿐 |
| FR-28 | 충족 · 측정 충족 | 집계 표 없이 요청 시 합 — `domain/policy/monthlySummary.ts:23-33` · p95 1.0ms(쿼리 2) |
| FR-30~33 | 충족 | 트랜잭션은 `application/UpdatePlanSettings.ts:35-41`(잠금 · 읽기 · 쓰기)뿐 — 예측 읽기 · 주 채움은 밖 |
| FR-40 | 대체 · 충족 | v1 인덱스 넷 중 `(user_id, week_of DESC)` 만 해당 — `prisma/migrations/20261119300100_plan_weekly/migration.sql:57`. 스냅샷 · GIN · status 인덱스는 대상 표가 없다 |
| FR-41 | 충족 | `EXPLAIN (ANALYZE, BUFFERS)` — `plan_settings` Index Scan 0.05ms · `weekly_plan_executions` Seq Scan 0.08~0.15ms(1~3페이지), `enable_seqscan = off` 에서 `(user_id, week_of)` 확인(루트 슬라이스 · `DB-REQ-013` 체크리스트) |
| FR-42 | 대체 | 10-29 정정 블록 — F004 는 GIN 을 쓰지 않는다 |
| FR-50~52 | 충족 | 자산 2 · 실패 사례 3 · 연속은 집계값 `streak`(`application/api/views.ts:74`) |
| FR-60 · 61 | 대체 · 범위 이동 | `staleDays` → "그 주 예측 행 없음 → fallback"(`SRV-REQ-020` 머리 블록) · 수집 성공/실패 · 워커 시간은 예측 `job_run` · 김프 캐시 없음. 주차별 실행/미실행 · 게이트 미렌더 카운터는 `OPS-001` FR-9 |
| FR-62 | 범위 이동 | `OPS-001` FR-9 |
| FR-63 | 충족 | 성능 수정이 없다 — 실측만 |

예산 행 — settings GET p95 0.7ms · complete p95 5.0ms(쿼리 3) · monthly 1.0ms. `/kimchi-premium` · `/streak` · `/indicators` 는 경로가 없다(`SRV-REQ-021` 머리 블록).

| 남은 것 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-60 · 62 주차별 실행 · 게이트 미렌더 카운터 | 배포 안 함 — 보낼 곳이 없다 | `OPS-001` FR-9 착수 시 |
