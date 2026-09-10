---
id: DB-REQ-005
feature: F001
area: db
kind: SCHEMA
title: "F001 개입 청구서 — 스키마 정의 (원장 확장 · 현금흐름 · 반사실 스냅샷 · 환율)"
priority: critical
labels: [db, prisma, schema, ledger, counterfactual, fx]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-001-intervention-invoice.md
---

## Summary

반사실 3트랙 계산과 거래별 귀속 손익이 올라갈 **원장**을 만든다. 거래 원장에 출처·결제일·통화·환율을 붙이고, KRW 입출금(`CashFlow`)과 반사실 스냅샷·거래 귀속·거래소 키·환율 원장을 신설한다.

**이 스키마가 F002(세금)·F003(적립)·F004(코치)의 입력이다.** 원장이 부정확하면 그 전부가 거짓말이 된다 — 글로벌 플랜 9절이 S1을 병목으로 명시한 이유다.

## 계산이 요구하는 것 — 스키마가 여기서 나온다

FEATURE-001 4절의 항등식:

```
Σ_k [Δq_k × (p_T − p_k) − fee_k]  −  Σ_j [d_j × (p_T/p_j − 1)]  ≡  interventionPnl
```

| 항 | 무엇이 필요한가 | 모델 |
|---|---|---|
| `Δq_k` 부호 수량 | 매수/매도 구분 + 수량 | `PortfolioTransaction` (있음) |
| `p_k` 체결 단가 | **원화 통일** 필요 → 외화면 결제일 환율 | `PortfolioTransaction` 확장 + `FxRate` |
| `fee_k` 수수료 | 있음 | `PortfolioTransaction.fee` |
| `d_j` 입출금 | **없다** | **`CashFlow` 신규** |
| `p_j` 입금일 종가 | 있음 | `PriceHistory` |
| `p_T` 최종가 | 있음 | `PriceHistory` / 실시간 |
| 중복 방지 | **없다** | `(source, sourceRef)` 유니크 |
| 스냅샷 | **없다** | **`CounterfactualSnapshot` 신규** |
| 거래별 귀속 | **없다** | **`TradeAttribution` 신규** |

## Schema — 원장 확장

```prisma
model PortfolioTransaction {
  // ... 기존 필드 유지 ...

  source          String    @default("manual")           // "manual" | "upbit_csv" | "upbit_api" | "kis_api" | "kis_csv"
  sourceRef       String?   @map("source_ref")           // 거래소 주문 UUID 또는 안정된 해시
  settlementDate  DateTime? @map("settlement_date")      // 미국주식 T+1. 크립토는 transactionDate
  currency        String    @default("KRW")              // 체결 통화
  priceCurrency   Decimal?  @map("price_currency") @db.Decimal(38, 10)  // 체결 통화 기준 단가
  fxRate          Decimal?  @map("fx_rate") @db.Decimal(18, 8)          // 결제일 기준환율

  @@unique([userId, source, sourceRef])
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 6개 필드를 추가한다 | Must |
| FR-2 | `@@unique([userId, source, sourceRef])`를 추가한다. **기존 row는 `sourceRef = null`이고 Postgres는 NULL을 서로 다른 값으로 보므로 제약 위반이 없다** | Must |
| FR-3 | `price`(기존 `Float`)는 **원화 단가**로 유지한다. 외화 거래는 `priceCurrency` × `fxRate`로 환산한 값을 `price`에 넣는다. **반사실·세금 계산이 `price`만 보면 되게** 한다 | Must |
| FR-4 | 크립토 row의 `settlementDate`는 `transactionDate`와 같다. **null을 남기지 않는다** — 계산 경로에 분기가 생긴다 | Must |
| FR-5 | `@@index([userId, settlementDate])`를 추가한다. 세금이 결제일 기준으로 집계한다 | Must |

## Schema — 신규 모델

```prisma
model CashFlow {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  direction  String                                        // "in" | "out"
  currency   String   @default("KRW")
  amount     Decimal  @db.Decimal(38, 10)
  occurredAt DateTime @map("occurred_at")
  source     String   @default("manual")
  sourceRef  String?  @map("source_ref")
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, source, sourceRef])
  @@index([userId, occurredAt])
  @@map("cash_flows")
}

model FxRate {
  id       String   @id @default(uuid())
  base     String                                          // "USD"
  quote    String                                          // "KRW"
  rateDate DateTime @map("rate_date") @db.Date
  rate     Decimal  @db.Decimal(18, 8)
  source   String
  kind     String   @default("settlement_base")            // 결제일 기준환율
  collectedAt DateTime @default(now()) @map("collected_at")

  @@unique([base, quote, rateDate, kind])
  @@index([base, quote, rateDate])
  @@map("fx_rates")
}

model CounterfactualSnapshot {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  window            String                                 // "30"|"90"|"180"|"365"|"all"
  rangeFrom         DateTime @map("range_from")
  rangeTo           DateTime @map("range_to")
  computedAt        DateTime @map("computed_at")

  actualValue       Decimal  @map("actual_value") @db.Decimal(38, 10)
  doNothingValue    Decimal  @map("do_nothing_value") @db.Decimal(38, 10)
  mechanicalDcaValue Decimal @map("mechanical_dca_value") @db.Decimal(38, 10)
  interventionPnl   Decimal  @map("intervention_pnl") @db.Decimal(38, 10)
  disciplinePnl     Decimal  @map("discipline_pnl") @db.Decimal(38, 10)
  totalFee          Decimal  @map("total_fee") @db.Decimal(38, 10)
  netDeposit        Decimal  @map("net_deposit") @db.Decimal(38, 10)
  tradeCount        Int      @map("trade_count")

  residual          Decimal  @db.Decimal(38, 10)           // 항등식 잔차. 숨기지 않는다
  degraded          Boolean  @default(false)
  degradedReasons   String[] @map("degraded_reasons")

  seriesJson        Json     @map("series_json")           // 표시용 시계열 (쿼리 대상 아님)
  biasBreakdownJson Json     @map("bias_breakdown_json")
  narrativeJson     Json?    @map("narrative_json")        // LLM 3문장. 생성 시 1회 저장

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, window, computedAt])
  @@index([userId, window, computedAt(sort: Desc)])
  @@map("counterfactual_snapshots")
}

model TradeAttribution {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  transactionId  String   @unique @map("transaction_id")
  symbol         String
  attributedPnl  Decimal  @map("attributed_pnl") @db.Decimal(38, 10)
  currentPriceAt DateTime @map("current_price_at")
  biasLabels     String[] @map("bias_labels")
  computedAt     DateTime @map("computed_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, attributedPnl])
  @@index([userId, computedAt(sort: Desc)])
  @@map("trade_attributions")
}

model ExchangeApiKey {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  provider        String                                    // "upbit" | "kis"
  accessKeyMasked String   @map("access_key_masked")
  secretCipher    String   @map("secret_cipher")            // 암호문만
  scopesJson      Json     @map("scopes_json")
  registeredAt    DateTime @default(now()) @map("registered_at")
  lastSyncedAt    DateTime? @map("last_synced_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("exchange_api_keys")
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `CashFlow` 신설. **입출금이 없으면 Do-Nothing 트랙을 계산할 수 없다** | Must |
| FR-11 | `FxRate` 신설. F002와 공유한다. `kind`로 기준환율 종류를 구분 | Must |
| FR-12 | `CounterfactualSnapshot` 신설. `residual`을 **컬럼으로** 갖는다 — 잔차를 숨기지 않는 것이 정책이다 | Must |
| FR-13 | `TradeAttribution` 신설. `@@index([userId, attributedPnl])`로 편향·손익 정렬 쿼리를 덮는다 | Must |
| FR-14 | `ExchangeApiKey` 신설. **`secretCipher`는 암호문만.** 평문 컬럼을 만들지 않는다. FEATURE-001은 `UpbitApiKey`로 적었으나 KIS도 필요하므로 **`provider` 컬럼을 둔 단일 모델**로 한다 | Must |
| FR-15 | `UserInvestmentProfile`에 `benchmarkSymbol String @default("KRW-BTC")`를 추가한다. Do-Nothing 기준자산 | Must |
| FR-16 | `User`에 신규 모델 5종의 역참조를 추가한다 | Must |

## 설계 판단 — 기록해 둔다

| 판단 | 근거 |
|---|---|
| `price`를 원화로 통일하고 `priceCurrency`를 따로 둔다 | 반사실·세금 계산이 3자산군을 합산한다. 계산 경로마다 환산하면 그 코드가 6곳에 생긴다 |
| `seriesJson`을 JSON으로 둔다 | 표시용이고 **쿼리 조건이 아니다**(`DB-REQ-002` FR-30 허용 목록) |
| `residual`을 컬럼으로 둔다 | 잔차 분포를 모니터링한다(관측성 요구). JSON 안에 있으면 집계가 안 된다 |
| `TradeAttribution.transactionId`를 `@unique`로 | 거래 1건 = 귀속 1건. 재계산은 upsert |
| `ExchangeApiKey`를 provider 컬럼 단일 모델로 | 업비트 + KIS 두 개가 필요하다. 모델 두 개면 스코프 검사 로직이 두 곳에 생긴다 |
| `CashFlow.currency`를 둔다 | 미국주식 입금이 달러일 수 있다. 지금은 KRW만 쓰지만 컬럼을 미리 둔다 |

## Acceptance Criteria

- [ ] `PortfolioTransaction`에 `source`·`sourceRef`·`settlementDate`·`currency`·`priceCurrency`·`fxRate`가 있다
- [ ] `@@unique([userId, source, sourceRef])`가 있고 **기존 row가 제약 위반 없이 남아 있다**
- [ ] `@@index([userId, settlementDate])`가 있다
- [ ] `CashFlow`·`FxRate`·`CounterfactualSnapshot`·`TradeAttribution`·`ExchangeApiKey` 5종이 있다
- [ ] 신규 금액 컬럼이 전부 `Decimal(38,10)`, 수량은 `Decimal(38,18)`, 환율은 `Decimal(18,8)`이다
- [ ] `CounterfactualSnapshot.residual`이 컬럼이다 (JSON 안이 아니다)
- [ ] `ExchangeApiKey`에 평문 secret 컬럼이 없다
- [ ] `UserInvestmentProfile.benchmarkSymbol`이 있고 기본값이 `"KRW-BTC"`다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과

## Trace

| FR | 대상 | 검증 |
|---|---|---|
| FR-1~5 | `PortfolioTransaction` | 기존 row 보존 + 유니크 동작 |
| FR-10~16 | 신규 5종 + 프로필 | `prisma validate` |

## Dependencies

- **선행:** `DB-REQ-001`(`AssetType` 3값) · `DB-REQ-002`(정책)
- **짝:** `DB-REQ-006`(불변식) · `DB-REQ-007`(마이그레이션) · `DB-REQ-008`(성능)
- **소비:** `SRV-REQ-012`~`015`(F001 서버) · `DB-REQ-009`(F002 세금 스키마가 `FxRate`를 공유)

## Open Questions

- **`sourceRef`를 무엇으로 쓸지.** 업비트 CSV에 주문 UUID가 있으면 그것, 없으면 `(체결시각+심볼+수량+단가)` 해시. **CSV 행 번호를 섞으면 재업로드 시 중복 방지가 깨진다**(`performance-database.md` §2). 실제 CSV 1건을 받아 확정해야 한다 — **FR-2 착수 전 선결.**
- 기존 `Float` 컬럼(`price`·`quantity`·`fee`·`totalAmount`)을 `Decimal`로 바꿀 시점. `DB-REQ-007`에서 판단.
- 스테이킹·에어드랍·코인 간 스왑을 이 모델로 표현할 수 없다. 1차 범위에서 제외하고 `unsupportedTransactions[]`로 노출할지 결정 필요.
