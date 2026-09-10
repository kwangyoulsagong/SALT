---
id: DB-REQ-020
feature: F004
area: db
kind: PERF
title: "F004 AI 코치 추천 — DB 성능 정의 (JSON 조건 제거 효과 · 성적표 집계)"
priority: high
labels: [db, performance, index, json-to-column, projection]
created: 2026-09-09
---

## Summary

F004의 성능 개선은 **`payload` JSON 조건 쿼리를 컬럼으로 승격하는 것**에서 나온다. 현재 `signal-performance`가 100건을 읽어와 루프로 버리고, 그 안에서 **거래마다 `PriceHistory`를 두 번 조회한다** — N+1이다.

## 지금 문제 — 실측 가능한 N+1

`signal-performance.service.ts`:

```ts
const insights = await prisma.investmentInsight.findMany({ ..., take: 100 });
for (const insight of insights) {
  const [entry, latest] = await Promise.all([
    prisma.priceHistory.findFirst({ where: { symbol, timestamp: { gte: insight.createdAt } }, orderBy: { timestamp: 'asc' } }),
    prisma.priceHistory.findFirst({ where: { symbol }, orderBy: { timestamp: 'desc' } }),
  ]);
}
```

**insight 100건 × 쿼리 2회 = 200 쿼리.** 그리고 `latest`는 심볼별로 같은 값인데 매번 조회한다.

## 예산

| 작업 | 예산 | 현재 추정 |
|---|---|---|
| 최신 추천 조회 | **50ms** | 인덱스 승격 후 |
| 코치 상세 조립 | **400ms** | 추천 + 성적표 + 실패이력 + 익절플랜 + 행동기록 |
| **신호 성적표(그룹별)** | **300ms** | **현재 200 쿼리 → 3 쿼리** |
| 실패 이력 조회 | 30ms | `IndicatorTrackRecord` |
| 익절 플랜 (보유 종목별) | 150ms | |
| 행동 기록 | 200ms | `behavior-coach` |
| 후보 목록 | 50ms | `payload`에서 읽는다 |
| 피드백 저장 | 50ms | upsert |
| 쿨다운 판정 | **20ms** | `CoachGenerationLog` 인덱스 |
| 추천 생성 (LLM 포함) | 6s · **비동기** | |

## 개선 1 — JSON 조건 제거

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `payload.kind === 'coach_feedback'` 필터를 **`WHERE kind != 'coach_feedback'`** 로 바꾼다 | Must |
| FR-2 | `@@index([userId, kind, createdAt DESC])`가 그 쿼리를 덮는다 | Must |
| FR-3 | 개선 전/후 **쿼리 수와 지연을 측정**해 기록한다 | Must |
| FR-4 | 신규 코드에 `payload` 조건 쿼리가 0건이다 | Must |

## 개선 2 — 성적표 N+1 제거

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | insight 100건의 심볼을 모아 **`PriceHistory`를 심볼별로 한 번씩** 조회한다 | Must |
| FR-11 | `latest`(심볼별 최신가)는 **심볼당 1회**다. insight마다 조회하지 않는다 | Must |
| FR-12 | `entry`(insight 시점 이후 첫 가격)는 **`(symbol, timestamp)` 범위 조회 1회로** 여러 insight를 커버한다 | Must |
| FR-13 | 목표: **쿼리 3회 이하** (insight 1 + latest 1 + entry 1) | Must |
| FR-14 | 개선 전/후 쿼리 수를 `log: ['query']`로 측정해 기록한다. **200 → 3** | Must |
| FR-15 | `signalType`별 그룹 집계를 **DB에서** 한다. 애플리케이션 루프로 그룹핑하지 않는다 | Must |

## 인덱스

| 쿼리 | 인덱스 | 상태 |
|---|---|---|
| `WHERE userId=? AND type='ai_coach' ORDER BY createdAt DESC LIMIT 100` | `@@index([userId, type, createdAt DESC])` | **신규** (`DB-REQ-004` FR-20에서 이미 요구) |
| `WHERE userId=? AND kind!='coach_feedback' ORDER BY createdAt DESC` | `@@index([userId, kind, createdAt DESC])` | 신규 |
| `WHERE userId=? AND signalType=? ORDER BY createdAt DESC` | `@@index([userId, signalType, createdAt DESC])` | 신규 |
| `WHERE symbol=? AND timeframe=? AND timestamp>=?` | `PriceHistory @@index([symbol, timeframe, timestamp])` | 기존 충분 |
| `WHERE userId=? ORDER BY requestedAt DESC LIMIT 1` | `CoachGenerationLog @@index([userId, requestedAt DESC])` | 신규 |
| `WHERE userId=? AND insightId=?` | `CoachFeedback @@unique([userId, insightId])` | 유니크가 인덱스 |
| 피드백 분포 집계 | `@@index([helpful, reasonCode])` | 신규 |
| `WHERE indicator=?` | `IndicatorTrackRecord` (F003) | F003이 담당 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 위 신규 인덱스 4개를 만든다 | Must |
| FR-21 | 각 인덱스의 `EXPLAIN (ANALYZE, BUFFERS)`를 checklist에 첨부한다. **`Seq Scan` on `investment_insights` 0건** | Must |
| FR-22 | `kind != 'coach_feedback'`는 **부등호**이므로 인덱스 효율이 낮다. **부분 인덱스**를 검토한다: `@@index([userId, createdAt DESC]) WHERE kind != 'coach_feedback'` | Should |

## Projection

| Projection | 쿼리 | 대체하는 것 |
|---|---|---|
| `InsightProjection.latestRecommendation` | `WHERE userId AND type AND kind ORDER BY createdAt DESC LIMIT 1` | 100건 로드 후 첫 번째 |
| `SignalPerformanceProjection.byType` | `GROUP BY signalType` + 가격 조인 | 애플리케이션 루프 |
| `FeedbackProjection.distribution` | `GROUP BY helpful, reasonCode` | 전체 로드 |
| `GenerationLogProjection.lastRequestedAt` | `ORDER BY requestedAt DESC LIMIT 1` | 전체 로드 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 위 4개를 `domain` Port로 선언하고 `infrastructure`가 구현한다 | Must |
| FR-31 | 코치 상세 렌더 1회의 **쿼리 수가 15개 이하**다 | Must |

## 쿨다운 판정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 쿨다운 판정이 **인덱스 1회 조회(20ms)** 다. 로그 전체를 읽지 않는다 | Must |
| FR-41 | `CoachGenerationLog`가 무한히 쌓인다. **보존 정책**을 정한다(최근 90일 또는 사용자당 최근 100건) | Must |
| FR-42 | 정리는 배치로 나눠 지운다 | Must |

## MVCC

| 대상 | 성질 | 대응 |
|---|---|---|
| `InvestmentInsight` | insert 위주 + `@@unique([userId, type, dedupeKey])` upsert | upsert가 UPDATE를 유발한다 → autovacuum 임계값 확인 |
| `CoachFeedback` | upsert | 동일 |
| `CoachGenerationLog` | insert만 | 보존 정책 필요 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `InvestmentInsight`의 upsert 빈도를 확인한다. `dedupeKey` 유니크가 있어 **같은 키로 계속 UPDATE된다** | Must |
| FR-51 | autovacuum 임계값을 테이블 단위로 낮춘다 | Should |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `payload` 전체를 응답에 담지 않는다. **필요한 필드만**(`reasons`·`risks`·`candidates`·`topCandidateFactors`) | Must |
| FR-61 | 성적표 샘플을 **20건까지만** 응답에 담는다(`SRV-REQ-005` 기존 계약) | Must |
| FR-62 | 실패 이력(`missesJson`)을 전부 담지 않는다. 최근 3건 | Should |

## Acceptance Criteria

- [ ] 신규 인덱스 4개가 있다
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` 결과가 checklist에 있고 `investment_insights`에 `Seq Scan`이 0건이다
- [ ] `payload` 조건 쿼리가 신규 코드에 0건이다
- [ ] **성적표 쿼리 수가 200 → 3 이하로 줄었다** (개선 전/후 측정값 기록)
- [ ] `latest` 조회가 심볼당 1회다
- [ ] `signalType` 그룹 집계가 DB에서 일어난다
- [ ] 성적표 조회 p95 < 300ms (측정값 기록)
- [ ] 최신 추천 조회 < 50ms
- [ ] 코치 상세 조립 p95 < 400ms (측정값 기록)
- [ ] 코치 상세 렌더 1회 쿼리 수 ≤ 15
- [ ] Projection 4개가 `domain` Port로 선언되어 있다
- [ ] 쿨다운 판정이 20ms 이내다
- [ ] `CoachGenerationLog` 보존 정책이 있고 정리가 배치다
- [ ] `InvestmentInsight` upsert 빈도가 확인되고 autovacuum이 조정되어 있다
- [ ] 응답에 `payload` 전체가 담기지 않는다
- [ ] 성적표 샘플이 20건 이하다

## Dependencies

- **선행:** `DB-REQ-017`~`019` · `DB-REQ-004` FR-20(인덱스)
- **구현:** `SRV-REQ-027`(F004 PERF)
- **규칙:** `performance-database.md`

## Open Questions

- `kind != 'coach_feedback'` 부등호 인덱스 효율. **부분 인덱스가 나은지 측정 후 판단**(FR-22).
- `entry` 조회를 범위 1회로 합칠 수 있는가. insight 100건의 시각이 흩어져 있으면 **심볼별 전체 구간을 받아 애플리케이션에서 매칭**하는 것이 나을 수 있다 → 데이터 양을 측정해야 한다.
- `CoachGenerationLog` 보존 기간. 쿨다운만 필요하면 **최근 1건만** 있으면 되지만, 관측성(LLM 성공률)을 위해서는 이력이 필요하다.
