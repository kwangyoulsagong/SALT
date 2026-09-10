---
id: DB-REQ-008
feature: F001
area: db
kind: PERF
title: "F001 개입 청구서 — DB 성능 정의 (원장 전수 스캔 · 스냅샷 · 배치 import)"
priority: critical
labels: [db, performance, index, batch, snapshot]
created: 2026-09-09
---

## Summary

반사실 계산은 **원장 전체를 훑는다.** 거래 5,000건 × 일봉 3,000개가 기준이고 예산이 p95 1.5s다. 이 REQ는 그 쿼리들을 인덱스로 덮고, 스냅샷으로 분리하고, import를 배치화한다.

## 예산

| 작업 | 예산 | 조건 |
|---|---|---|
| 기간 내 거래 조회 | 100ms | 5,000건 |
| 기간 내 입출금 조회 | 50ms | |
| 심볼 일봉 구간 조회 | 200ms | 3,000개 |
| 반사실 전체 계산 (스냅샷 미스) | **1.5s (p95)** | 위 3개 + 계산 |
| 스냅샷 조회 (히트) | **50ms** | |
| 거래 귀속 목록 (편향 필터 + 손익 정렬) | 200ms | |
| 수수료 합계 | 30ms | Projection |
| CSV import 10,000행 | **10s** | 배치 insert |
| 일봉 백필 3,000개 | 5s | 배치 insert |
| 홀딩 재계산 | 300ms | |

## 쿼리와 인덱스 — 하나씩 대응시킨다

| 쿼리 | 인덱스 | 상태 |
|---|---|---|
| `WHERE userId = ? AND transactionDate BETWEEN ? AND ? ORDER BY transactionDate` | `PortfolioTransaction @@index([userId, transactionDate])` | **기존으로 충분** |
| `WHERE userId = ? AND assetType = ? AND symbol = ? ORDER BY transactionDate` | `@@index([userId, assetType, symbol])` | 기존. **정렬 컬럼이 없다** → 5,000건에서 sort 비용. 측정 후 `([userId, assetType, symbol, transactionDate])`로 확장 검토 |
| `WHERE userId = ? AND settlementDate BETWEEN ? AND ?` (세금 공유) | **신규** `@@index([userId, settlementDate])` | `DB-REQ-005` FR-5 |
| `WHERE userId = ? AND occurredAt BETWEEN ? AND ?` | **신규** `CashFlow @@index([userId, occurredAt])` | |
| `WHERE symbol = ? AND timeframe = 'd1' AND timestamp BETWEEN ? AND ?` | `PriceHistory @@index([symbol, timeframe, timestamp])` | **기존으로 충분** |
| `WHERE userId = ? AND window = ? ORDER BY computedAt DESC LIMIT 1` | **신규** `@@index([userId, window, computedAt DESC])` | 스냅샷 최신 1건 |
| `WHERE userId = ? ORDER BY attributedPnl ASC LIMIT 3` (최대 손실) | **신규** `@@index([userId, attributedPnl])` | |
| `WHERE userId = ? AND biasLabels @> ARRAY[?]` | **없음** | 배열 조건. `GIN` 인덱스가 필요하지만 **라벨 6종·거래 5,000건이면 `userId` 인덱스 후 필터가 더 싸다.** 측정 후 결정 |
| `WHERE base = ? AND quote = ? AND rateDate = ?` | **신규** `FxRate @@unique([base, quote, rateDate, kind])` | 유니크가 인덱스 역할 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 신규 인덱스 5개를 만든다 | Must |
| FR-2 | 각 인덱스 추가 후 `EXPLAIN (ANALYZE, BUFFERS)` 결과를 checklist에 첨부한다. **`Seq Scan` on 원장이 0건**이어야 한다 | Must |
| FR-3 | `biasLabels` 배열 조건은 **GIN 인덱스를 만들지 않고 시작**한다. 5,000건 필터 비용을 측정하고, 200ms를 넘으면 그때 만든다 | Must |
| FR-4 | `@@index([userId, assetType, symbol])`에 정렬 컬럼 추가 여부를 **측정으로 판단**한다. 이미 있는 복합 인덱스의 접두사와 같은 인덱스를 새로 만들지 않는다 | Should |

## 스냅샷 분리 — 예산을 지키는 유일한 방법

반사실 전체 계산이 1.5s다. 화면 첫 페인트 예산은 300ms다. **매 요청마다 계산하면 못 지킨다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 화면은 **스냅샷을 먼저 그리고 현재가만 실시간 보정**한다 | Must |
| FR-11 | 스냅샷은 **월요일 09:00 KST 워커**가 전 window(30/90/180/365/all)에 대해 만든다 | Must |
| FR-12 | 스냅샷 조회는 `(userId, window, computedAt DESC) LIMIT 1`이다. **50ms 이내** | Must |
| FR-13 | 스냅샷 미스 시 **비동기로 계산을 띄우고** `degraded: true` + 마지막 스냅샷을 반환한다. 요청을 1.5s 붙잡지 않는다 | Must |
| FR-14 | 워커는 **userId 단위 advisory lock**을 잡는다. 같은 사용자 계산이 두 번 동시에 돌지 않게 | Must |
| FR-15 | 스냅샷은 `(userId, window, computedAt)` 유니크로 **멱등**이다. 같은 시간 버킷 재실행이 row를 늘리지 않는다 | Must |
| FR-16 | `seriesJson`은 기간 `all`이면 수천 개다. **표시 해상도로 다운샘플링**해서 저장한다 — 일별 전부를 JSON에 넣으면 응답이 커진다 | Must |

## import 배치화

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | CSV 파싱을 **트랜잭션 밖**에서 하고 결과만 배치 insert한다 | Must |
| FR-21 | `createMany`로 1,000건 단위 배치. **단건 insert 10,000번은 왕복 10,000번**이다 | Must |
| FR-22 | 중복 판정을 애플리케이션 루프로 하지 않는다. `createMany({ skipDuplicates: true })` 또는 유니크 제약 위반 처리로 DB에 맡긴다 | Must |
| FR-23 | 일봉 백필도 배치 insert. 3,000개를 단건으로 넣지 않는다 | Must |
| FR-24 | import 후 홀딩 재계산은 **심볼별 집계 쿼리 1회**로 한다. 거래를 전부 읽어 루프로 합산하지 않는다 | Must |

## Projection — Aggregate를 로드하지 않는다

| 화면 요구 | 잘못된 방법 | 맞는 방법 |
|---|---|---|
| 수수료 총액 + 건수 | 거래 5,000건 로드 후 `reduce` | `SUM(fee), COUNT(*)` Projection |
| 편향별 집계 | 귀속 5,000건 로드 후 그룹핑 | `GROUP BY` Projection (또는 스냅샷의 `biasBreakdownJson`) |
| 최대 손실 3건 | 전체 정렬 후 slice | `ORDER BY attributedPnl LIMIT 3` |
| 홀딩 요약 | 거래 전부 로드 | `PortfolioHolding` 조회 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 위 4개를 Projection으로 구현한다. `domain`에 Port로 선언하고 `infrastructure`가 구현한다 | Must |
| FR-31 | 화면 하나에 나가는 쿼리 수를 측정한다. **20개를 넘으면 설계 문제**다 | Must |

## MVCC 주의

| 대상 | 성질 | 대응 |
|---|---|---|
| `PortfolioHolding` | **가격 갱신마다 UPDATE** | autovacuum 임계값을 낮춘다 |
| `TradeAttribution` | 재계산마다 upsert | 동일 |
| `CounterfactualSnapshot` | insert만 (append) | 보존 정책 필요 — 무한히 쌓인다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `PortfolioHolding`·`TradeAttribution`의 autovacuum 임계값을 테이블 단위로 낮춘다 | Should |
| FR-41 | `CounterfactualSnapshot` 보존 정책을 정한다. **window별 최근 N개만 유지**하고 나머지는 배치로 나눠 지운다 | Should |

## Acceptance Criteria

- [ ] 신규 인덱스 5개가 있다
- [ ] 각 인덱스의 `EXPLAIN (ANALYZE, BUFFERS)` 결과가 checklist에 있고 원장에 `Seq Scan`이 0건이다
- [ ] 거래 5,000건 시딩 후 반사실 전체 계산 p95 < 1.5s (측정값 기록)
- [ ] 스냅샷 조회 < 50ms
- [ ] 스냅샷 미스 시 요청이 1.5s를 붙잡지 않고 `degraded`로 즉시 응답한다
- [ ] 워커를 같은 사용자에 2회 동시 실행해도 계산이 1회만 돈다 (advisory lock)
- [ ] 워커를 3회 실행해도 스냅샷 row가 1건이다 (멱등)
- [ ] `seriesJson`이 다운샘플링되어 있다
- [ ] CSV 10,000행 import < 10s
- [ ] import에서 단건 insert가 0건이다 (`createMany` 사용)
- [ ] 중복 판정이 애플리케이션 루프가 아니다
- [ ] 홀딩 재계산이 집계 쿼리 1회다
- [ ] Projection 4개가 구현되어 있고 Aggregate 로드가 0건이다
- [ ] 청구서 화면 1회 렌더의 쿼리 수가 20개 이하다 (`log: ['query']`로 확인)
- [ ] `biasLabels` 필터 비용이 측정되어 있다

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~4 | 인덱스 5개 | `EXPLAIN` 첨부 |
| FR-10~16 | 스냅샷 워커 + 조회 | 멱등·락·예산 측정 |
| FR-20~24 | import 배치 | 10,000행 측정 |
| FR-30~31 | Projection 4개 | 쿼리 수 카운트 |
| FR-40~41 | vacuum 설정 · 보존 정책 | 죽은 튜플 추이 |

## Dependencies

- **선행:** `DB-REQ-005`(스키마) · `DB-REQ-007`(마이그레이션)
- **구현:** `SRV-REQ-015`(F001 PERF — 서버 쪽 예산)
- **규칙:** `performance-database.md` · `performance-server.md`

## Open Questions

- 거래 5,000건 / 일봉 3,000개가 실제 규모와 맞는가. 사용자 ≤10명이면 **훨씬 작을 수 있다** — 그러면 스냅샷 없이도 예산을 지킬 수 있고 FR-10~16의 복잡도를 줄일 수 있다. **실측 후 재검토.**
- `CounterfactualSnapshot` 보존 개수. window 5개 × 주 1회 × 1년 = 260건/사용자. 크지 않으므로 **전부 보존이 기본안**일 수 있다.
- `biasLabels`를 배열 대신 정규화 테이블로 둘지. 배열 조건이 200ms를 넘으면 그때 판단.
