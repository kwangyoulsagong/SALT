---
id: DB-REQ-009
feature: F002
area: db
kind: SCHEMA
title: "F002 세금 마감 콕핏 — 스키마 정의 (취득가액 lot · 법령 파라미터 · 결제 캘린더 · 시가 스냅샷 · 증빙)"
priority: critical
labels: [db, prisma, schema, tax, cost-basis, law-config]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-002-tax-deadline-cockpit.md
---

## Summary

자산군 3종의 세금 규칙이 완전히 다르고, 그 차이 때문에 매년 연말에 돈이 샌다. 이 스키마는 그 계산에 필요한 것을 담는다 — **취득가액 lot** · **법령 파라미터(전부 설정값)** · **결제 영업일 캘린더** · **2026-12-31 시가 스냅샷(1회성·수정불가)** · **증빙 아카이브**.

`FxRate`는 `DB-REQ-005`(F001)가 신설한 것을 **공유**한다.

## 계산이 요구하는 것

| 계산 | 필요한 것 | 모델 |
|---|---|---|
| 미국주식 연간 실현손익 (결제일 기준) | `settlementDate` + 결제일 환율 | `PortfolioTransaction`(F001 확장) + `FxRate`(공유) |
| 취득가액 (이동평균 / FIFO 2방식) | lot 단위 소진 이력 | **`CostBasisLot` 신규** |
| 손실 수확 솔버 | 평가손실 + 매도 가능 수량 + 마감일 | `PortfolioHolding` + `SettlementCalendar` |
| 환율 함정 탐지 | 매수·매도 각 결제일 환율 | `FxRate`(공유) |
| 크립토 스텝업 | 2026-12-31 시가 | **`YearEndPriceSnapshot` 신규** |
| D-Day | 시행일·기준일·T+N·권고 버퍼 | **`TaxLawConfig` 신규** |
| 마지막 매도 영업일 | 시장 휴장일 + 결제 처리일 | **`SettlementCalendar` 신규** |
| 증빙 | CSV 원본 + 연도별 요약 | **`EvidenceArchive` 신규** |
| D-Day 알림 중복 방지 | 발송 기록 | `NotificationDelivery`(F007과 공유) |

## Schema

```prisma
model CostBasisLot {
  id                  String    @id @default(uuid())
  userId              String    @map("user_id")
  assetType           AssetType @map("asset_type")
  symbol              String

  acquiredAt          DateTime  @map("acquired_at")
  settlementDate      DateTime  @map("settlement_date")
  quantity            Decimal   @db.Decimal(38, 18)
  remainingQuantity   Decimal   @map("remaining_quantity") @db.Decimal(38, 18)
  unitCost            Decimal   @map("unit_cost") @db.Decimal(38, 10)        // 체결 통화
  unitCostKrw         Decimal   @map("unit_cost_krw") @db.Decimal(38, 10)    // 결제일 환율 환산
  fxRate              Decimal?  @map("fx_rate") @db.Decimal(18, 8)
  method              String                                                  // "moving_average" | "fifo"
  sourceTransactionId String    @map("source_transaction_id")
  computedAt          DateTime  @map("computed_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, assetType, symbol, acquiredAt])
  @@index([userId, assetType, symbol, method])
  @@map("cost_basis_lots")
}

model TaxLawConfig {
  id                        String    @id @default(uuid())
  userId                    String    @map("user_id")
  assetClass                String    @map("asset_class")          // crypto | us_stock | kr_stock
  status                    String                                  // enforced | under_review | deferred | repealed
  effectiveFrom             DateTime? @map("effective_from")
  taxRate                   Decimal   @map("tax_rate") @db.Decimal(18, 8)
  localTaxRate              Decimal   @map("local_tax_rate") @db.Decimal(18, 8)
  basicDeduction            Decimal   @map("basic_deduction") @db.Decimal(38, 10)
  deemedCostBasisDate       DateTime? @map("deemed_cost_basis_date")
  taxFreeDeadline           DateTime? @map("tax_free_deadline")     // tz 오프셋 포함
  settlementLagDays         Int       @default(1) @map("settlement_lag_days")
  recommendedBufferDays     Int       @default(1) @map("recommended_buffer_days")
  transactionTaxRate        Decimal?  @map("transaction_tax_rate") @db.Decimal(18, 8)
  dividendWithholdingRate   Decimal?  @map("dividend_withholding_rate") @db.Decimal(18, 8)
  financialIncomeThreshold  Decimal?  @map("financial_income_threshold") @db.Decimal(38, 10)
  majorShareholderThreshold Decimal?  @map("major_shareholder_threshold") @db.Decimal(38, 10)
  costBasisMethod           String    @default("moving_average") @map("cost_basis_method")
  roundingMode              String    @default("HALF_UP") @map("rounding_mode")
  fxSource                  String?   @map("fx_source")
  basisNote                 String?   @map("basis_note")
  sourceUrl                 String?   @map("source_url")
  updatedAt                 DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, assetClass])
  @@map("tax_law_configs")
}

model SettlementCalendar {
  id             String   @id @default(uuid())
  market         String                                    // "US" | "KR"
  date           DateTime @db.Date
  isTradingDay   Boolean  @map("is_trading_day")
  isSettlementDay Boolean @map("is_settlement_day")
  note           String?

  @@unique([market, date])
  @@index([market, date])
  @@map("settlement_calendars")
}

model YearEndPriceSnapshot {
  id           String    @id @default(uuid())
  assetType    AssetType @map("asset_type")
  symbol       String
  snapshotDate DateTime  @map("snapshot_date") @db.Date
  price        Decimal   @db.Decimal(38, 10)
  source       String
  collectedAt  DateTime  @map("collected_at")
  isManual     Boolean   @default(false) @map("is_manual")
  auditNote    String?   @map("audit_note")

  @@unique([symbol, snapshotDate])
  @@index([snapshotDate])
  @@map("year_end_price_snapshots")
}

model EvidenceArchive {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  source      String                                       // upbit | kis | manual
  kind        String                                       // trades_csv | cashflow_csv | year_summary | snapshot
  year        Int
  storagePath String   @map("storage_path")
  cipherMeta  Json     @map("cipher_meta")
  sizeBytes   Int      @map("size_bytes")
  storedAt    DateTime @map("stored_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, year])
  @@map("evidence_archives")
}
```

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `CostBasisLot` 신설. **`method` 컬럼으로 이동평균·FIFO 두 방식을 나란히 저장**한다. SALT는 어느 쪽을 쓸지 권고하지 않으므로 둘 다 보여준다 | Must |
| FR-2 | `unitCost`(체결 통화)와 `unitCostKrw`(결제일 환율 환산)를 **둘 다** 갖는다. 환율 함정 탐지가 두 값을 비교한다 | Must |
| FR-3 | `TaxLawConfig` 신설. **세율·공제·시행일·기준일·T+N·권고버퍼·거래세율·배당원천징수율·금융소득기준·대주주기준·취득가액방법·반올림방식·환율소스가 전부 컬럼**이다. 코드 상수 0건 | Must |
| FR-4 | `taxFreeDeadline`·`deemedCostBasisDate`는 **tz 오프셋을 포함**한다. 12/30과 12/31의 차이가 250만원 공제 한 해분이다 | Must |
| FR-5 | `SettlementCalendar` 신설. 미국 시장 휴장일 + 국내 결제 처리일. **연 1회 갱신하는 설정 테이블**이다 | Must |
| FR-6 | `YearEndPriceSnapshot` 신설. `@@unique([symbol, snapshotDate])`. **수정·삭제 불가**(불변식은 `DB-REQ-010`) | Must |
| FR-7 | `EvidenceArchive` 신설. `cipherMeta`에 암호화 메타만. **원본 파일은 DB에 넣지 않는다**(`storagePath`) | Must |
| FR-8 | `FxRate`는 F001이 신설한 것을 공유한다. **중복 생성하지 않는다** | Must |
| FR-9 | `User`에 신규 4종 역참조를 추가한다(`SettlementCalendar`·`YearEndPriceSnapshot`은 사용자 무관) | Must |
| FR-10 | `TaxLawConfig`를 **사용자별로** 둔다(`@@unique([userId, assetClass])`). 지인이 각자 자기 전제를 바꿀 수 있어야 하고, 법령 해석은 개인 책임이다 | Must |

## 설계 판단

| 판단 | 근거 |
|---|---|
| lot을 `method`별로 중복 저장한다 | 두 방식의 취득가액이 다르고 화면이 둘을 나란히 보여준다. 요청마다 두 번 계산하면 예산(600ms)을 못 지킨다 |
| `TaxLawConfig`를 사용자별로 둔다 | 크립토 과세가 국회에서 재유예·폐지될 수 있다. 전역 설정이면 한 사람의 판단이 전체에 적용된다 |
| `SettlementCalendar`를 사용자 무관 전역으로 둔다 | 시장 휴장일은 개인 판단이 아니다 |
| `YearEndPriceSnapshot`을 사용자 무관으로 둔다 | 2026-12-31 시가는 모두에게 같다. 사용자별로 두면 값이 갈릴 수 있다 |
| 증빙 원본을 파일시스템에 두고 경로만 저장 | CSV 1년치가 수 MB다. DB에 넣으면 백업·복원이 무거워진다 |
| `roundingMode`를 설정값으로 | 세금 절사 규칙의 법령 근거가 미확정이다(Open Question). 코드에 박으면 바꿀 때 재배포다 |

## Acceptance Criteria

- [ ] `CostBasisLot`·`TaxLawConfig`·`SettlementCalendar`·`YearEndPriceSnapshot`·`EvidenceArchive` 5종이 있다
- [ ] `FxRate`가 **한 번만** 정의되어 있다 (F001과 공유)
- [ ] 신규 금액 컬럼이 전부 `Decimal(38,10)`, 수량 `Decimal(38,18)`, 비율·환율 `Decimal(18,8)`이다
- [ ] `TaxLawConfig`에 세율·공제·시행일·기준일·T+N·권고버퍼·거래세율·배당율·금융소득기준·대주주기준·취득가액방법·반올림·환율소스 컬럼이 전부 있다
- [ ] `taxFreeDeadline`·`deemedCostBasisDate`에 tz 오프셋이 보존된다 (저장 후 조회로 확인)
- [ ] `YearEndPriceSnapshot`에 `@@unique([symbol, snapshotDate])`가 있다
- [ ] `CostBasisLot`에 `(userId, assetType, symbol, method)` 인덱스가 있다
- [ ] `EvidenceArchive`에 원본 파일 바이너리 컬럼이 없다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-001`(`AssetType` 3값) · `DB-REQ-005`(`FxRate`, 원장 확장) · `DB-REQ-002`(정책)
- **짝:** `DB-REQ-010`(불변식) · `DB-REQ-011`(마이그레이션) · `DB-REQ-012`(성능)
- **소비:** `SRV-REQ-016`~`019`(F002 서버)

## Open Questions

- **세금 절사 규칙(원 단위 절사 vs 반올림)의 법령 근거.** 국세청 예규 확인이 필요하고 그때까지 `roundingMode` 기본값은 `HALF_UP`.
- 대주주 기준(종목당 50억)이 국내주식에만 적용된다. `TaxLawConfig`를 자산군별로 두었으므로 `kr_stock` row에만 채운다 — **null 허용 컬럼이 자산군마다 다른 것이 맞는가**, 아니면 자산군별 별도 모델이 맞는가.
- `EvidenceArchive`의 저장 위치(로컬 파일시스템 vs 오브젝트 스토리지). 5분 만료 서명 URL이 요구사항이므로 후자가 자연스럽다.
- 미국 시장 휴장일 데이터 소스. 연 1회 수동 입력인지 API인지.
