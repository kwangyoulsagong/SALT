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

## Summary

F003은 **예산이 가장 널널한 기능**이다. 지표가 일 1회, 계획이 주 1회 생성이므로 조회가 전부 캐시 히트여야 한다. **250ms를 넘으면 캐시 전제가 깨진 것**이다.

## 예산

| 작업 | 예산 | 조건 |
|---|---|---|
| `GET /api/plan/weekly` | **250ms** | 전부 캐시 히트 |
| `GET /api/plan/streak` | 100ms | 최근 12주 |
| `GET /api/plan/settings` | 30ms | |
| `PATCH /api/plan/settings` | 100ms | |
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

## Dependencies

- **선행:** `SRV-REQ-020`~`022` · `DB-REQ-016`
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- 김프를 주간 계획 응답에 포함할지 별도로 뺄지(FR-13). **별도가 안전**하지만 화면이 두 번 부른다 → BFF가 병렬로 부르면 된다.
- 지표 소스가 느리면(5s 타임아웃) 워커 총 10s를 넘을 수 있다. 병렬이면 괜찮다.
- GIN 인덱스가 4행 테이블에서 실익이 있는가(`DB-REQ-016` Open Question).
