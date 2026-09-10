---
id: DB-REQ-007
feature: F001
area: db
kind: MIGRATION
title: "F001 개입 청구서 — 마이그레이션 정의 (원장 확장 · Float→Decimal 판단)"
priority: critical
labels: [db, migration, backfill, decimal, rollback]
created: 2026-09-09
---

## Summary

원장 확장과 신규 모델 5종을 **독립 롤백 가능한 단계**로 나눈다. 가장 큰 판단은 **기존 `Float` 원장 컬럼을 `Decimal`로 바꿀지**이고, 이 문서가 그 결정을 내린다.

## 결정 — 기존 `Float` 컬럼을 지금 `Decimal`로 바꾼다

### 대상

```prisma
PortfolioTransaction  quantity Float · price Float · totalAmount Float · fee Float
PortfolioHolding      totalQuantity · averageBuyPrice · totalInvested · currentPrice
                      currentValue · unrealizedProfit · unrealizedProfitRate · realizedProfit
```

### 후보 3개를 비교했다

| | A. 바꾸지 않고 매퍼에서 승격 | **B. 지금 바꾼다** | C. 나중에 바꾼다 |
|---|---|---|---|
| 계산 정확도 | 읽을 때 승격하므로 계산은 안전 | **✓** | 동일 |
| **저장 정확도** | **✗ `Float`로 저장된다** | **✓** | ✗ |
| 이관 비용 | 0 | 중간 | 중간 (같다) |
| 영향 코드 | 0 | `portfolio` · `profit-plan` · `behavior-coach` · `signal-performance` | 동일 |
| 위험 | **누적 오차가 남는다** | 마이그레이션 락 | 나중에 데이터가 더 많다 |

**A를 버린 이유가 결정적이다.** 반사실 항등식은 **저장된 값을 다시 읽어** 계산한다. `Float`로 저장된 `price`가 `1.1` 대신 `1.1000000000000001`이면, 거래 5,000건을 합산할 때 그 오차가 쌓인다. 허용치가 **100원**이다. 매퍼 승격은 계산 중 오차만 막고 **저장 시 발생한 오차는 이미 값 안에 있다.**

**C를 버린 이유:** 데이터가 늘어나면 마이그레이션이 더 비싸진다. **지금이 가장 싼 시점**이고, F002·F003·F004가 이 원장 위에 올라가기 전에 해야 한다.

**B의 대가:** `portfolio.service` · `profit-plan.service` · `behavior-coach.service` · `signal-performance.service`가 `number` 산술을 쓰고 있어 함께 고쳐야 한다. 그것은 `SRV-REQ-006`(DDD 전환)의 `Money` VO 도입과 **같은 작업**이다 — 따로 하면 두 번 고친다.

## 마이그레이션 순서

| 단계 | 이름 | 내용 | 롤백 |
|---|---|---|---|
| M1 | `20260909_fx_rate` | `FxRate` 신설 | 테이블 drop |
| M2 | `20260909_cash_flow` | `CashFlow` 신설 + `User` 역참조 | 동일 |
| M3 | `20260909_ledger_source` | `PortfolioTransaction`에 `source`·`sourceRef`·`settlementDate`·`currency`·`priceCurrency`·`fxRate` 추가 (**기본값 있는 컬럼 추가만**) | 컬럼 drop |
| M4 | `20260909_ledger_backfill` | 기존 row: `source = "manual"` (기본값으로 이미 채워짐), `settlementDate = transactionDate`, `currency = "KRW"` | 역방향 UPDATE |
| M5 | `20260909_ledger_unique` | `@@unique([userId, source, sourceRef])` + `@@index([userId, settlementDate])` | 제약·인덱스 drop |
| M6 | `20260909_exchange_key` | `ExchangeApiKey` 신설 | 테이블 drop |
| M7 | `20260909_counterfactual` | `CounterfactualSnapshot` · `TradeAttribution` 신설 | 동일 |
| M8 | `20260909_profile_benchmark` | `UserInvestmentProfile.benchmarkSymbol` 추가 | 컬럼 drop |
| M9 | **`20260909_ledger_decimal`** | 원장 `Float` → `Decimal` 교체 (2단계 방식, §"M9 상세") | **`pg_dump` 복원** |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1~M8을 릴리스 R1에, **M9를 별도 릴리스 R2**에 배포한다. M9는 코드 변경(`Money` VO)과 짝이다 | Must |
| FR-2 | M3은 **기본값 있는 컬럼 추가만** 한다. Postgres 11+에서 이는 빠르지만 `ACCESS EXCLUSIVE` 락을 잠깐 잡는다 → 워커를 먼저 멈춘다 | Must |
| FR-3 | M4의 `settlementDate = transactionDate` 백필 후 **null이 0건**임을 확인한다 (`DB-REQ-006` INV-6) | Must |
| FR-4 | M5는 M4 이후여야 한다. 백필 전에 유니크를 걸면 기존 row가 전부 `sourceRef = null`이라 통과하지만, **의미상 순서가 맞다** | Must |
| FR-5 | M9 실행 전 `pg_dump -Fc` 스냅샷 + **복원 테스트 1회**. 경로를 커밋 메시지에 기록 | Must |

## M9 상세 — `Float` → `Decimal` 2단계 교체

`ALTER TABLE ... ALTER COLUMN ... TYPE numeric`은 테이블을 다시 쓴다. 원장이 크면 위험하다.

```sql
-- 1단계: 새 컬럼 추가
ALTER TABLE portfolio_transactions ADD COLUMN price_new numeric(38,10);

-- 2단계: 배치 백필 (1,000건 단위)
UPDATE portfolio_transactions SET price_new = price::numeric
 WHERE id IN (SELECT id FROM portfolio_transactions WHERE price_new IS NULL LIMIT 1000);

-- 3단계: 컬럼 교체 (짧은 락)
ALTER TABLE portfolio_transactions DROP COLUMN price, RENAME COLUMN price_new TO price;
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 원장 row 수를 먼저 측정한다. **10,000건 이하면 직접 `ALTER TYPE`**, 초과면 2단계 교체 | Must |
| FR-11 | `Float → numeric` 변환은 **값을 바꿀 수 있다** (`0.1` 이진 표현). 변환 전/후 합계를 비교해 **차이가 허용치 안인지 확인**하고 기록한다 | Must |
| FR-12 | 변환 후 `count(*)`와 `sum(quantity)`·`sum(totalAmount)`를 전후 비교한다 | Must |
| FR-13 | 구 컬럼을 즉시 drop하지 않고 **1개 릴리스 유지**하는 것을 검토한다. 원장은 백업이 없다 | Should |
| FR-14 | M9 후 `ANALYZE` 실행 | Must |

## 롤백 절차

| 단계 | 롤백 |
|---|---|
| M1·M2·M6·M7 | 테이블 drop. 데이터 손실은 신규 데이터뿐 |
| M3 | 컬럼 drop. 기존 데이터 무손실 |
| M4 | 역방향 UPDATE (`settlementDate = NULL`) |
| M5 | 제약·인덱스 drop |
| M8 | 컬럼 drop |
| **M9** | **`pg_dump` 복원.** 다른 방법이 없다 — 타입 교체는 되돌리면 다시 `Float` 오차가 생긴다 |

## Acceptance Criteria

- [ ] M1~M9가 각각 독립 마이그레이션 파일이다
- [ ] M9가 별도 릴리스(R2)이고 `Money` VO 도입 커밋과 짝이다
- [ ] M4 후 `settlementDate`가 null인 row가 0건이다
- [ ] M5의 유니크가 존재하고 기존 row가 제약 위반 없이 남아 있다
- [ ] 원장 row 수가 기록되고, 10,000건 초과 시 2단계 교체가 쓰였다
- [ ] `Float → numeric` 변환 전/후 `sum(quantity)`·`sum(totalAmount)` 차이가 기록되어 있고 허용치 안이다
- [ ] 원장 3종 `count(*)`가 M1 전 = M9 후
- [ ] M9 전 `pg_dump` 스냅샷 경로가 커밋 메시지에 있고 복원 테스트를 1회 했다
- [ ] M9 후 `ANALYZE`가 실행되었다
- [ ] 마이그레이션 중 워커가 중단되었다
- [ ] `prisma migrate status` clean + `npm run build` 통과

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~5 | `prisma/migrations/20260909_*` 9개 | `migrate status` |
| FR-10~14 | M9 실행 계획 + 측정 기록 | 합계 대조 |

## Dependencies

- **선행:** `DB-REQ-005`(스키마) · `DB-REQ-003`(F000 마이그레이션이 먼저)
- **짝:** `SRV-REQ-006`(DDD 전환 — `Money` VO)가 M9와 같은 릴리스
- **후속:** `DB-REQ-009`(F002)가 `FxRate`를 공유하므로 M1 이후

## Open Questions

- **원장 실제 row 수.** FR-10 판정의 입력이다. 착수 전 측정.
- `Float → numeric` 변환에서 값이 얼마나 달라지는가. 허용치를 미리 정해야 한다 — **기본안: 합계 차이가 총액의 0.0001% 이하**.
- 구 컬럼 1개 릴리스 유지(FR-13)를 할지. 하면 스키마가 잠시 지저분하고, 안 하면 되돌릴 수 없다. **원장에 백업이 없다는 점 때문에 유지가 기본안.**
