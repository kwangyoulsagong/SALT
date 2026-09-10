---
id: DB-REQ-012
feature: F002
area: db
kind: PERF
title: "F002 세금 마감 콕핏 — DB 성능 정의 (lot 재계산 · 솔버 입력 · 환율 조회)"
priority: high
labels: [db, performance, index, cost-basis, solver]
created: 2026-09-09
---

## Summary

세금 콕핏의 부하는 **lot 재계산**(원장 전량 × method 2)과 **솔버 입력 조회**(보유 종목 전부 × 환율)에 있다. 콕핏 전체 예산이 600ms, 솔버가 500ms다.

## 예산

| 작업 | 예산 | 조건 |
|---|---|---|
| D-Day 계산 | **0ms (DB 접근 없음)** | 클라이언트가 `TaxLawConfig` + 캘린더 값으로 계산 |
| `TaxLawConfig` 조회 | 20ms | 사용자당 3행 |
| `SettlementCalendar` 구간 조회 | 30ms | 12/20~1/10 |
| lot 조회 (심볼별, method별) | 50ms | |
| 미국주식 연간 실현손익 집계 | **200ms** | 결제일 기준 + 환율 조인 |
| 환율 조회 (단건) | 20ms | 유니크 인덱스 |
| 환율 구간 조회 (함정 탐지) | 100ms | 보유 종목 수 × 2 |
| 솔버 입력 조회 (보유 50종목) | **200ms** | |
| 콕핏 전체 | **600ms** | 위 전부 병렬 |
| **lot 전량 재계산** | **3s · 비동기** | 거래 5,000건 × method 2 = 10,000 lot |
| 증빙 목록 조회 | 50ms | |

## 쿼리와 인덱스

| 쿼리 | 인덱스 | 상태 |
|---|---|---|
| `WHERE userId=? AND assetClass=?` | `TaxLawConfig @@unique([userId, assetClass])` | 유니크가 인덱스 |
| `WHERE market=? AND date BETWEEN ? AND ?` | `SettlementCalendar @@unique([market, date])` + `@@index([market, date])` | 충분 |
| `WHERE userId=? AND assetType=? AND symbol=? AND method=?` | `CostBasisLot @@index([userId, assetType, symbol, method])` | 신규 |
| `WHERE userId=? AND assetType=? AND symbol=? ORDER BY acquiredAt` (FIFO) | `@@index([userId, assetType, symbol, acquiredAt])` | 신규 |
| `WHERE userId=? AND settlementDate BETWEEN ? AND ? AND transactionType='sell'` | `PortfolioTransaction @@index([userId, settlementDate])` | `DB-REQ-005` FR-5 |
| `WHERE base=? AND quote=? AND rateDate=? AND kind=?` | `FxRate @@unique([base, quote, rateDate, kind])` | 유니크가 인덱스 |
| `WHERE base=? AND quote=? AND rateDate IN (...)` | `FxRate @@index([base, quote, rateDate])` | 신규 |
| `WHERE symbol=? AND snapshotDate=?` | `YearEndPriceSnapshot @@unique([symbol, snapshotDate])` | 유니크가 인덱스 |
| `WHERE userId=? AND year=?` | `EvidenceArchive @@index([userId, year])` | 신규 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 신규 인덱스 4개를 만든다 | Must |
| FR-2 | `EXPLAIN (ANALYZE, BUFFERS)` 결과를 checklist에 첨부한다. **원장·lot에 `Seq Scan`이 0건** | Must |
| FR-3 | 실현손익 집계는 **환율을 N+1로 조회하지 않는다.** 거래 목록의 결제일을 모아 `rateDate IN (...)` 한 번으로 받는다 | Must |
| FR-4 | 솔버 입력도 동일하다. 보유 50종목의 환율을 50번 조회하지 않는다 | Must |

## lot 재계산 — 가장 무거운 작업

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | lot 재계산은 **비동기**다. 원장 import 완료 후 백그라운드로 돈다 | Must |
| FR-11 | 재계산 중에는 콕핏이 **마지막 lot 기반으로 응답**하고 `degraded` + `cost_basis_recomputing`을 표시한다 | Must |
| FR-12 | 재계산은 심볼별로 나눈다. 전체를 한 트랜잭션에 넣지 않는다 | Must |
| FR-13 | lot 삭제·재생성은 `deleteMany` + `createMany` **배치**다. 단건 10,000번을 하지 않는다 | Must |
| FR-14 | 같은 사용자 재계산이 두 번 동시에 돌지 않게 **advisory lock**을 잡는다 | Must |
| FR-15 | 재계산 후 `ANALYZE`가 필요한지 판단한다. lot이 전량 교체되므로 통계가 바뀐다 | Should |

## 솔버 — CPU 바운드이므로 DB에서 미리 좁힌다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 솔버 입력은 **평가손실 보유 종목만** 조회한다. 전체 보유를 로드해 애플리케이션에서 필터하지 않는다 | Must |
| FR-21 | `PortfolioHolding`에서 `unrealizedProfit < 0` 조건으로 좁힌다. 부분 인덱스를 검토한다: `@@index([userId]) WHERE unrealized_profit < 0` | Should |
| FR-22 | 마감일이 지난 종목을 **DB 조회 단계에서 제외**한다(`SettlementCalendar` 조인 또는 사전 계산된 마감일 비교) | Must |
| FR-23 | 솔버는 순수 함수다. **계산 중 DB를 다시 부르지 않는다** — 입력을 한 번에 받는다 | Must |

## MVCC

| 대상 | 성질 | 대응 |
|---|---|---|
| `CostBasisLot` | **재계산마다 전량 삭제·재생성** | autovacuum 임계값을 낮춘다. 죽은 튜플이 가장 많이 쌓이는 테이블이다 |
| `TaxLawConfig` | 드물게 UPDATE | 기본값 |
| `SettlementCalendar` | 연 1회 | 기본값 |
| `YearEndPriceSnapshot` | insert만, 수정 불가 | 기본값 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `CostBasisLot`의 autovacuum 임계값을 테이블 단위로 낮춘다 | Must |
| FR-31 | lot 재계산 빈도를 측정한다. CSV 재업로드가 잦으면 **증분 재계산을 검토**한다(단 FIFO 순서 문제가 있다 — `DB-REQ-010` FR-4) | Should |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | lot을 응답에 전부 담지 않는다. **집계값(이동평균 단가·FIFO 단가·총 취득가액)만** 준다 | Must |
| FR-41 | 솔버 후보 3개 각각의 매도 목록을 담되, 종목 수를 상한으로 자른다 | Must |
| FR-42 | 증빙 목록은 페이징한다. 연도 × 소스 × 종류로 늘어난다 | Should |

## Acceptance Criteria

- [ ] 신규 인덱스 4개가 있다
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` 결과가 checklist에 있고 원장·lot에 `Seq Scan`이 0건이다
- [ ] 실현손익 집계가 환율을 `IN (...)` 한 번으로 조회한다 (쿼리 로그로 확인, N+1 0건)
- [ ] 솔버 입력이 환율을 종목 수만큼 조회하지 않는다
- [ ] 콕핏 전체 조회 p95 < 600ms (측정값 기록)
- [ ] 솔버 실행 < 500ms (종목 50개 기준, 측정값 기록)
- [ ] lot 전량 재계산이 비동기이고 요청을 붙잡지 않는다
- [ ] 재계산 중 콕핏이 `degraded` + `cost_basis_recomputing`으로 응답한다
- [ ] lot 삭제·재생성이 배치다 (단건 0건)
- [ ] 같은 사용자 재계산이 동시에 두 번 돌지 않는다
- [ ] 솔버 입력이 평가손실 종목만 조회한다
- [ ] 마감일 지난 종목이 DB 조회 단계에서 제외된다
- [ ] 솔버 계산 중 DB 호출이 0건이다
- [ ] `CostBasisLot` autovacuum 임계값이 낮춰져 있다
- [ ] 응답에 lot 개별 row가 0건이다 (집계값만)
- [ ] 콕핏 렌더 1회의 쿼리 수가 20개 이하다

## Dependencies

- **선행:** `DB-REQ-009`~`011` · `DB-REQ-008`(F001 성능 — 같은 원장을 읽는다)
- **구현:** `SRV-REQ-019`(F002 PERF)
- **규칙:** `performance-database.md`

## Open Questions

- 거래 5,000건 × method 2 = 10,000 lot 재계산이 3s 안에 되는가. **실측 필요.** 안 되면 method를 하나만 저장하고 다른 하나는 요청 시 계산하는 방식을 검토한다.
- 부분 인덱스(`WHERE unrealized_profit < 0`)가 실익이 있는가. 보유 종목이 50개면 전체 스캔이 더 싸다.
- 증분 lot 재계산이 가능한가. FIFO 순서가 과거 거래 삽입에 영향받으므로 **삽입 시점이 최신인 경우에만** 증분이 안전하다.
