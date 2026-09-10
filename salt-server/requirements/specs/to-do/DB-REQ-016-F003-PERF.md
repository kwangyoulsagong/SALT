---
id: DB-REQ-016
feature: F003
area: db
kind: PERF
title: "F003 밸류에이션 밴드 적립 — DB 성능 정의 (전부 캐시 히트여야 한다)"
priority: medium
labels: [db, performance, index, cache-hit, worker]
created: 2026-09-09
---

## Summary

F003은 **지표가 일 1회 갱신**이므로 조회가 전부 캐시 히트여야 한다. 예산이 가장 널널한 기능이고, 유일한 실시간 요소는 **김프**다.

## 예산

| 작업 | 예산 | 조건 |
|---|---|---|
| 주간 계획 조회 | **250ms** | 전부 캐시 히트 |
| 지표 최신값 조회 | **20ms** | `(indicator, asOf DESC) LIMIT 1` |
| 실패 이력 조회 | 30ms | `indicator @unique` |
| 밴드 설정 조회 | 20ms | `(userId, symbol)` |
| 이번 주 계획 조회 | 30ms | `(userId, weekOf, symbol)` |
| 연속 주차·누적액 | 100ms | 집계 |
| **김프** | **실시간, 30초 캐시** | 유일한 실시간 |
| 적립 완료 기록 | 50ms | upsert |
| 원장 매칭 | 200ms | 주간 윈도우 거래 조회 |
| 지표 수집 (워커) | 지표당 2s · 총 10s | 일 1회 |
| 주간 계획 생성 (워커) | 사용자당 200ms | 주 1회 |

## 인덱스

| 쿼리 | 인덱스 | 상태 |
|---|---|---|
| `WHERE indicator=? ORDER BY asOf DESC LIMIT 1` | `IndicatorSnapshot @@index([indicator, asOf DESC])` | 신규 |
| `WHERE indicator=?` | `IndicatorTrackRecord @unique` | 유니크가 인덱스 |
| `WHERE signalTypes @> ARRAY[?]` | `@@index([signalTypes], type: Gin)` | 신규 (**F004가 쓴다**) |
| `WHERE userId=? AND symbol=?` | `PlanSettings @@unique([userId, symbol])` | 유니크가 인덱스 |
| `WHERE userId=? AND weekOf=? AND symbol=?` | `WeeklyPlanExecution @@unique(...)` | 유니크가 인덱스 |
| `WHERE userId=? ORDER BY weekOf DESC LIMIT 12` | `@@index([userId, weekOf DESC])` | 신규 (연속 주차) |
| `WHERE userId=? AND status='planned'` | `@@index([userId, status])` | 신규 (미실행 마감) |
| `WHERE userId=? AND transactionDate BETWEEN ? AND ? AND symbol=?` | `PortfolioTransaction @@index([userId, assetType, symbol])` | 기존 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 신규 인덱스 4개를 만든다 | Must |
| FR-2 | `EXPLAIN (ANALYZE, BUFFERS)`를 checklist에 첨부한다 | Must |
| FR-3 | **GIN 인덱스가 F004의 게이트 조회를 덮는지** 확인한다. F003보다 F004가 더 자주 쓴다 | Must |

## 캐시 히트가 전제다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 지표는 **일 1회 갱신**이므로 조회가 전부 캐시 히트다. **요청마다 외부 API를 부르지 않는다** | Must |
| FR-11 | 주간 계획은 **주 1회 워커가 미리 만든다.** 조회 시 계산하지 않는다 | Must |
| FR-12 | 밴드 계산은 **계획 생성 시 1회**다. 조회 시 다시 계산하지 않는다 | Must |
| FR-13 | 그래서 250ms 예산이 널널하다. **넘으면 캐시 전제가 깨진 것**이다 | Must |

## 김프 — 유일한 실시간

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 김프는 업비트 + 바이낸스 + 환율을 실시간으로 본다 | Must |
| FR-21 | **TTL 30초 캐시**. 매 요청마다 외부를 부르지 않는다 | Must |
| FR-22 | 김프 실패 시 **게이지만 숨기고 적립 숫자는 유지**한다 | Must |
| FR-23 | 김프를 DB에 저장할지 인메모리 캐시로 둘지 → **인메모리가 맞다.** 30초 값을 이력으로 남길 이유가 없다 | Must |

## 워커

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `indicator-sync.worker` 일 1회 06:00 KST. **멱등**(`@@unique` upsert) | Must |
| FR-31 | `weekly-plan.worker` 주 1회 월 07:00 KST. **멱등**(`@@unique` upsert) | Must |
| FR-32 | 두 워커는 **DB만 훑는다.** LLM 워커와 같은 큐에 넣지 않는다 | Must |
| FR-33 | 지표 수집 실패는 지수 백오프 3회. 최종 실패 시 carry-forward | Must |
| FR-34 | 주간 계획 생성 시 **이전 주 미실행분을 `skipped`로 마감**한다. 배치 UPDATE | Must |
| FR-35 | 사용자 수가 적으므로(≤10) 워커 실행이 짧다. **총 10초 이내** | Must |

## MVCC

| 대상 | 성질 | 대응 |
|---|---|---|
| `IndicatorSnapshot` | 일 1회 upsert | 기본값 |
| `WeeklyPlanExecution` | 주 1회 생성 + 실행 시 UPDATE | 기본값 |
| `PlanSettings` | 드물게 UPDATE | 기본값 |
| `IndicatorTrackRecord` | 거의 안 바뀐다 | 기본값 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 전부 갱신이 드물다. **autovacuum 조정이 불필요**하다 | Must |
| FR-41 | `IndicatorSnapshot`이 일 1회 × 지표 4개 = 연 1,460건이다. **보존 정책이 불필요**하다 | Must |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `bandConfigJson`은 작다(밴드 5개). 그대로 전달해도 된다 | Must |
| FR-51 | `hitsJson`·`missesJson`은 항목이 적다(각 5개 이하). 전부 전달 | Must |
| FR-52 | 연속 주차 계산에 최근 **12주**만 조회한다. 전체를 읽지 않는다 | Must |

## Acceptance Criteria

- [ ] 신규 인덱스 4개가 있다
- [ ] `EXPLAIN` 결과가 checklist에 있다
- [ ] **GIN 인덱스가 F004 게이트 조회를 덮는다** (`EXPLAIN` 확인)
- [ ] 주간 계획 조회 p95 < 250ms (측정값 기록)
- [ ] 지표 최신값 조회 < 20ms
- [ ] **요청 시 외부 지표 API 호출이 0건이다**
- [ ] **요청 시 밴드 계산이 0건이다** (계획 생성 시 1회)
- [ ] 김프가 TTL 30초 캐시이고 인메모리다
- [ ] 김프 실패 시 게이지만 숨겨지고 적립 숫자가 유지된다
- [ ] `indicator-sync.worker`를 같은 날 3회 실행해도 스냅샷이 1건이다
- [ ] `weekly-plan.worker`를 3회 실행해도 계획이 1건이다
- [ ] **두 워커가 LLM 워커와 다른 큐에 있다**
- [ ] 지표 수집 실패 시 carry-forward된다
- [ ] 이전 주 미실행분이 배치로 `skipped` 처리된다
- [ ] 워커 총 실행 시간이 10초 이내다
- [ ] 연속 주차 계산이 최근 12주만 조회한다

## Dependencies

- **선행:** `DB-REQ-013`~`015`
- **구현:** `SRV-REQ-023`(F003 PERF)
- **공유:** GIN 인덱스를 F004가 쓴다(`DB-REQ-020`)
- **규칙:** `performance-database.md`

## Open Questions

- 김프를 인메모리 캐시로 두면 **서버 재기동 시 사라진다.** 30초 값이므로 문제가 아니다.
- `IndicatorSnapshot` 백필 90일이면 360건이다. 조회 성능에 영향이 없다.
- GIN 인덱스가 배열 4개 이하에서 실익이 있는가. **`IndicatorTrackRecord`가 4행뿐이면 전체 스캔이 더 싸다** → 측정 후 제거를 검토할 수 있다.
