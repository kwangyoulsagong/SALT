---
id: DB-REQ-004
feature: F000
area: db
kind: PERF
title: "F000 정리·편집 — DB 성능 정의 (마이그레이션 락 · 기존 인덱스 점검)"
priority: high
labels: [db, performance, migration-lock, index]
created: 2026-09-09
---

## Summary

F000의 마이그레이션은 **모델 7종에 걸친 `ALTER TYPE`** 을 유발한다. 그 락 시간이 이 REQ의 주된 위험이고, 부수적으로 기존 인덱스가 앞으로 올 쿼리를 덮는지 점검한다.

## 예산

| 작업 | 예산 | 초과 시 |
|---|---|---|
| `AssetType` 확장 (M1, 값 추가) | 1s | 값 추가는 메타데이터 변경이다. 넘으면 다른 문제다 |
| `stock` → `kr_stock` 백필 (M2) | 10s | 배치로 나눈다 |
| `InviteCode` 생성 (M3) | 1s | |
| 모델 2 + enum 2 drop (M4) | 5s | |
| **`AssetType` 값 제거 (M5, 타입 교체)** | **10s** | **컬럼 교체 방식으로 전환** |
| 마이그레이션 전체 (R1) | 30s | 서비스 중단 창 5분 안에 들어와야 한다 |

## 위험 1 — M5의 `ALTER TABLE ... TYPE`

`AssetType`을 참조하는 모델이 **7종**이다: `InvestmentWatchlist` · `PortfolioTransaction` · `PortfolioHolding` · `MarketAsset` · `PriceHistory` · `TechnicalIndicator` · `InvestmentInsight`.

그중 두 개가 누적 테이블이다.

| 테이블 | 성질 | 위험 |
|---|---|---|
| `PriceHistory` | 심볼 × timeframe × timestamp. 일봉·분봉이 계속 쌓인다 | **가장 크다** |
| `TechnicalIndicator` | 동일 | 크다 |
| 나머지 5 | 사용자 ≤10명 규모 | 낮다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M5 실행 전 `PriceHistory`·`TechnicalIndicator`의 `count(*)`를 측정해 기록한다 | Must |
| FR-2 | 스테이징(또는 스냅샷 복원본)에서 M5를 **먼저 실행해 락 시간을 측정**한다 | Must |
| FR-3 | 락 시간이 **10초를 넘으면** 컬럼 교체 방식으로 전환한다: 새 컬럼 추가 → 배치 백필 → 컬럼 교체 → 구 컬럼 drop | Must |
| FR-4 | `ALTER TABLE`은 `ACCESS EXCLUSIVE` 락을 잡는다. **긴 트랜잭션이 도는 중에 실행하지 않는다** — 워커를 먼저 멈춘다 | Must |
| FR-5 | 마이그레이션 중 워커 6개를 중단한다. 재기동 순서를 문서에 남긴다 | Must |

## 위험 2 — 백필이 긴 트랜잭션이 된다

M2의 `UPDATE ... SET asset_type = 'kr_stock' WHERE asset_type = 'stock'`이 대상 row가 많으면 긴 트랜잭션 + 대량 죽은 튜플이 된다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | M2 실행 전 각 테이블의 `stock` row 수를 측정한다. **0건이면 no-op이고 M5를 R1에 합칠 수 있다** | Must |
| FR-11 | 대상 row가 **10,000건을 넘으면 배치로 나눈다**(1,000건 단위) | Must |
| FR-12 | 백필 후 `ANALYZE`를 실행한다. 통계가 틀리면 이후 쿼리가 잘못된 계획을 탄다 | Must |

## 점검 — 기존 인덱스가 앞으로 올 쿼리를 덮는가

F001~F004가 원장을 읽는다. 기존 인덱스로 충분한지 미리 본다.

| 앞으로 올 쿼리 | 기존 인덱스 | 판정 |
|---|---|---|
| 기간 내 사용자 거래 전부 (반사실) | `PortfolioTransaction @@index([userId, transactionDate])` | **충분** |
| 심볼별 사용자 거래 (취득가액 lot) | `@@index([userId, assetType, symbol])` | **충분** |
| 심볼 일봉 구간 (반사실·백필) | `PriceHistory @@index([symbol, timeframe, timestamp])` | **충분** |
| 사용자 보유 전부 (포지션·세금) | `PortfolioHolding @@index([userId])` | **충분** |
| 사용자·타입별 인사이트 (코치) | `InvestmentInsight @@index([userId, type])` | **부족** — 최신순 정렬이 붙는다 → `@@index([userId, type, createdAt DESC])` 필요 |
| `payload.kind` 필터 (성적표) | 없음 | **불가** — JSON 조건. `kind` 컬럼 승격 필요 (DB-REQ-017) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `InvestmentInsight`에 `@@index([userId, type, createdAt(sort: Desc)])`를 추가한다. `signal-performance`가 최근 100건을 최신순으로 읽는다 | Must |
| FR-21 | `payload.kind` 조건 쿼리를 **더 늘리지 않는다.** 컬럼 승격은 DB-REQ-017이 담당 | Must |
| FR-22 | 위 인덱스 추가 후 `EXPLAIN (ANALYZE, BUFFERS)` 결과를 checklist에 첨부한다 | Must |

## 부수 효과 — worker 1개 감소

`market-price-updater.worker`(서버) 제거로 DB 커넥션 상시 사용량이 줄어야 한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 정리 전/후 **상시 커넥션 수**를 측정해 기록한다 (`pg_stat_activity`) | Should |
| FR-31 | 정리 전/후 `MarketAsset` 갱신 빈도를 확인한다. BFF worker 단일 경로로 갱신이 유지되어야 한다 | Must |

## Acceptance Criteria

- [ ] `PriceHistory`·`TechnicalIndicator` row 수가 기록되어 있다
- [ ] M5 락 시간이 스테이징에서 측정되고 10초 이하다 (또는 컬럼 교체 방식으로 전환됨)
- [ ] 마이그레이션 전체가 30초 이내에 끝난다
- [ ] `stock` row 수가 기록되고, 10,000건 초과 시 배치로 처리되었다
- [ ] 백필 후 `ANALYZE`가 실행되었다
- [ ] `InvestmentInsight`에 `(userId, type, createdAt DESC)` 인덱스가 있다
- [ ] 그 인덱스의 `EXPLAIN (ANALYZE, BUFFERS)` 결과가 checklist에 있다 (`Seq Scan` 없음)
- [ ] 마이그레이션 중 워커가 중단되었고 재기동 순서가 문서에 있다
- [ ] 정리 전/후 상시 커넥션 수가 기록되어 있다
- [ ] `MarketAsset` 갱신이 BFF worker 단일 경로로 유지된다

## Dependencies

- **선행:** `DB-REQ-001`(스키마) · `DB-REQ-003`(마이그레이션 순서)
- **연동:** `SRV-REQ-007`(worker 제거) — FR-30·31이 그 효과를 측정한다
- **규칙:** `performance-database.md`

## Open Questions

- 스테이징 환경 존재 여부. 없으면 `pg_dump` 복원본에서 측정한다.
- `PriceHistory`의 실제 row 수. FR-3 판정의 입력이다.
