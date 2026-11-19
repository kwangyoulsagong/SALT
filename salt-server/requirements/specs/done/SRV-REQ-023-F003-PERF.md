---
id: SRV-REQ-023
feature: F003
area: srv
kind: PERF
title: "F003 밸류에이션 밴드 적립 — 서버 성능 정의 (캐시 히트 전제)"
priority: medium
labels: [performance, budget, cache-hit, worker, kimchi]
created: 2026-09-09
---

> **2026-10-29 전수 조사 — 아래 본문 중 지금과 다른 것** (본문은 당시 기록으로 둔다)
> - F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천 스냅샷 원장에서 실패사례를 읽는다(`SRV-REQ-024` FR-105 · 134 · 176, `GetCoachDetail.ts`). "M2 가 F004 보다 먼저" 순서 근거도 사라짐 — `indicator` 컨텍스트 근거는 F003 착수 때 다시 쓴다


## Summary

F003은 **예산이 가장 널널한 기능**이다. 지표가 일 1회, 계획이 주 1회 생성이므로 조회가 전부 캐시 히트여야 한다. **250ms를 넘으면 캐시 전제가 깨진 것**이다.

## 예산

| 작업 | 예산 | 조건 |
|---|---|---|
| `GET /api/plan/weekly` | **250ms** | 전부 캐시 히트 |
| `GET /api/plan/streak` | 100ms | 최근 12주 |
| `GET /api/plan/settings` | 30ms | |
| `PATCH /api/plan/settings` | 100ms | 첫 저장은 그 주 계획 upsert 포함 **150ms** (2026-09-21 — B12) |
| `GET /api/plan/monthly-summary` | 50ms | ≤10행 SUM (2026-09-21 — B20) |
| `POST /api/plan/weekly/complete` | 100ms | upsert |
| **`GET /api/plan/kimchi-premium`** | **실시간, 30초 캐시** | 유일한 실시간 |
| `GET /api/indicators` | 50ms | 최신 1건 × N |
| `GET /api/indicators/:i/track-record` | 30ms | 유니크 |
| `indicator-sync.worker` | 지표당 2s · **총 10s** | 일 1회 |
| `weekly-plan.worker` | 사용자당 200ms · **총 10s** | 주 1회 |

## 캐시 히트가 전제다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **요청 시 외부 지표 API를 부르지 않는다.** 워커가 일 1회 수집한 것을 읽는다 | Must |
| FR-2 | **요청 시 밴드를 계산하지 않는다.** 주간 계획 생성 시 1회 계산해 저장한 것을 읽는다 | Must |
| FR-3 | 250ms를 넘으면 **캐시 전제가 깨진 것**이다. 원인을 찾는다 | Must |
| FR-4 | 지표 최신값을 **이름 목록으로 한 번에** 조회한다. N+1 0건 | Must |
| FR-5 | 실패 이력을 **`indicator` 공개 API 1회**로 받는다 | Must |

## 김프 — 유일한 실시간

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **TTL 30초 인메모리 캐시**. 매 요청마다 외부 3곳을 부르지 않는다 | Must |
| FR-11 | 3소스(업비트·바이낸스·환율)를 **병렬**로 부른다 | Must |
| FR-12 | 각 호출에 타임아웃(1s). 김프가 주간 계획 응답(250ms)을 막으면 안 된다 | Must |
| FR-13 | **김프를 주간 계획 응답에 포함할지 별도 엔드포인트로 뺄지** — 별도가 안전하다. 김프 실패가 계획 조회를 막지 않는다 | Must |
| FR-14 | 김프 실패 시 `null`. 적립 숫자는 유지 | Must |
| FR-15 | 캐시 히트율을 측정한다 | Should |

## 워커

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `indicator-sync`가 지표를 **병렬**로 수집한다. 순차면 4개 × 2s = 8s다 | Must |
| FR-21 | 각 지표 수집에 타임아웃(5s) | Must |
| FR-22 | 실패는 지수 백오프 3회. **한 지표 실패가 나머지를 막지 않는다** | Must |
| FR-23 | `weekly-plan`이 사용자별로 돈다. ≤10명이므로 순차도 괜찮다 | Must |
| FR-24 | 이전 주 미실행 마감을 **배치 UPDATE**로 한다. 사용자별 루프 0건 | Must |
| FR-25 | **두 워커가 LLM 워커와 다른 큐에 있다.** DB만 훑으므로 빠르다 | Must |
| FR-26 | 워커 실행 시간을 측정한다 | Must |
| FR-27 | **2026-09-21 추가 — B12.** 첫 저장의 그 주 계획 생성은 **요청 안에서 1사용자분만** 한다. 지표는 저장된 최신 스냅샷을 쓰고 외부를 부르지 않는다(FR-1) | Must |
| FR-28 | **2026-09-21 추가 — B20.** 이번 달 합계는 집계 테이블·캐시 없이 요청 시 SUM한다. ≤10행이다 | Must |

## 트랜잭션

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **외부 지표 API 호출을 트랜잭션 밖**에서 한다 | Must |
| FR-31 | 김프 계산(외부 3곳)도 트랜잭션 밖 | Must |
| FR-32 | 수집 결과 저장만 짧은 트랜잭션 | Must |
| FR-33 | `prisma.$transaction`은 `application`에서만 | Must |

## 인덱스

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `DB-REQ-016`의 인덱스 4개를 쓴다 | Must |
| FR-41 | `EXPLAIN` 결과를 checklist에 첨부한다 | Must |
| FR-42 | **GIN 인덱스(`signalTypes`)가 F004 게이트 조회를 덮는지** 확인한다 | Must |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `items`는 자산 수만큼이다(현재 2개). 작다 | Must |
| FR-51 | `hits`·`misses`는 각 5개 이하. 전부 담아도 된다 | Must |
| FR-52 | 연속 주차는 집계값만. 12주 원본을 담지 않는다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정: **지표 수집 성공/실패**, **`staleDays` 분포**, 주차별 실행/미실행 카운터, 김프 캐시 히트율·실패율, 워커 실행 시간, 게이트 미렌더 카운터 | Must |
| FR-61 | **`staleDays` 분포가 가장 중요하다.** 지표가 자주 결측되면 배수가 계속 1.0x로 폴백되고 기능이 무의미해진다 | Must |
| FR-62 | 게이트 미렌더(실패 이력 없음) 카운터를 남긴다 | Must |
| FR-63 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] `GET /api/plan/weekly` p95 < 250ms (측정값 기록)
- [ ] **요청 시 외부 지표 API 호출이 0건이다**
- [ ] **요청 시 밴드 계산이 0건이다**
- [ ] 지표 최신값이 한 번에 조회된다 (N+1 0건)
- [ ] 실패 이력이 공개 API 1회로 조회된다
- [ ] 김프가 TTL 30초 캐시이고 3소스를 병렬로 부른다
- [ ] 김프가 **별도 엔드포인트**이고 계획 조회를 막지 않는다
- [ ] 김프 실패 시 적립 숫자가 유지된다
- [ ] `indicator-sync`가 지표를 병렬 수집하고 총 10s 이내다
- [ ] 한 지표 실패가 나머지를 막지 않는다
- [ ] 이전 주 미실행 마감이 배치 UPDATE다
- [ ] **두 워커가 LLM 워커와 다른 큐에 있다**
- [ ] 워커 실행 시간이 측정된다
- [ ] 외부 호출이 트랜잭션 밖이다
- [ ] `prisma.$transaction`이 `application` 밖에 0건이다
- [ ] `EXPLAIN` 결과가 checklist에 있다
- [ ] **GIN 인덱스가 F004 게이트 조회를 덮는다**
- [ ] 관측 항목 6종이 있다
- [ ] **`staleDays` 분포가 측정된다**
- [ ] 게이트 미렌더 카운터가 있다
- [ ] 첫 `PATCH /settings`(계획 upsert 포함) p95 < 150ms, 외부 호출 0건 (B12)
- [ ] `GET /monthly-summary` p95 < 50ms (B20)

## Dependencies

- **선행:** `SRV-REQ-020`~`022` · `DB-REQ-016`
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- 김프를 주간 계획 응답에 포함할지 별도로 뺄지(FR-13). **별도가 안전**하지만 화면이 두 번 부른다 → BFF가 병렬로 부르면 된다.
- 지표 소스가 느리면(5s 타임아웃) 워커 총 10s를 넘을 수 있다. 병렬이면 괜찮다.
- GIN 인덱스가 4행 테이블에서 실익이 있는가(`DB-REQ-016` Open Question).

## 정리 2026-11-19 — FR 대조 (`WEB-perf-req-close-slice.md`)

> 지표 수집 · 김프 · 밴드 계산이 예측 배치(`FC-REQ-029`)로 가고 서버는 금액 · 사람 기록만(`SRV-REQ-020` · `022` 머리 블록). 실측 — 임시 서버 4020(쿼리 줄 셈) · 임시 BFF 4011 · 예열 2회 뒤 10~20회 순차 · 웹은 투자 zone 운영 빌드 헤드리스 1440×900 3회(루트 `WEB-perf-req-close-slice.md` 실측 표)

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

판정: **done**

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 첫 저장·이번 달 합계 예산과 FR-27·28 추가(B12 · B20) |
| 2026-10-29 | 전수 조사 — 현재와 다른 서술 정정(머리 블록). 본문은 당시 기록으로 둠 |
| 2026-11-19 | FR 대조 정리(`WEB-perf-req-close-slice.md`) — 워커 · 김프 FR 대체 · p95 · 쿼리 수 · EXPLAIN 실측(첫 PATCH 는 반복 PATCH p95 7.1ms 로 대신) · 카운터는 `OPS-001` FR-9 로 범위 이동. to-do → done |
