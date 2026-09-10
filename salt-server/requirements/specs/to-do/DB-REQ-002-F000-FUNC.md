---
id: DB-REQ-002
feature: F000
area: db
kind: FUNC
title: "F000 정리·편집 — 데이터 정책 정의 (금액 타입 · 불변식 · 멱등 · 보존)"
priority: high
labels: [db, policy, decimal, idempotency]
created: 2026-09-09
source: FEATURE-000, FEATURE-001 4절(계산 정의), 글로벌 플랜 11절
---

## Summary

DB-REQ-004 이후 모든 신규 모델이 따르는 **데이터 정책**을 정의한다. 금액 타입, 반올림 시점, 멱등 키, 시각 저장, JSON 사용 한계, 인덱스 근거, 보존 규칙. 이 문서를 어기면 청구서 항등식(잔차 ≤ 100원)과 세금 계산이 성립하지 않는다.

## Background

- FEATURE-001의 핵심 수용 기준은 **무작위 300케이스에서 `reconciliation.residual` 절대값 ≤ 100원**이다. 현재 `PortfolioTransaction.price`·`quantity`·`fee`가 전부 `Float`다. 거래 5,000건을 `Float`로 누적하면 이 허용치를 지킬 수 없다.
- 현재 `signal-performance.service`는 `payload.kind === "coach_feedback"`을 **애플리케이션 레이어에서 필터**한다(`InvestmentInsight.payload` JSON). 100건을 읽어와 루프로 버린다. JSON 조건은 인덱스를 못 쓴다.
- CSV 재업로드·worker 재시도가 일상이다. 멱등 키가 없으면 원장이 오염되고, 오염된 원장 위에서는 청구서·세금이 전부 거짓말이 된다.
- 12/30 매도와 12/31 매도의 차이가 **250만원 공제 한 해분**이다. 시각을 UTC로만 저장하고 KST 경계를 표시 레이어에서 계산하면 하루가 밀린다.

## Requirements

### A. 금액과 수량

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-1 | 신규 **금액** 컬럼은 `Decimal @db.Decimal(38, 10)`. 원화·달러 공통 | Must |
| FR-2 | 신규 **수량** 컬럼은 `Decimal @db.Decimal(38, 18)`. 크립토 소수 8자리 + 여유 | Must |
| FR-3 | 신규 **비율/환율** 컬럼은 `Decimal @db.Decimal(18, 8)` | Must |
| FR-4 | 기존 `Float` 컬럼(`PortfolioTransaction.price/quantity/fee/totalAmount`, `PortfolioHolding.*`)은 **이 REQ에서 타입을 바꾸지 않는다.** 신규 계산 경로가 읽을 때 `Decimal`로 승격한다. 타입 변경은 DB-REQ-006(원장 마이그레이션)에서 원장 확장과 함께 다룬다 | Must |
| FR-5 | **원 단위 정수 반올림은 응답 직전 1회만.** DB에는 반올림하지 않은 값을 저장한다. 중간 반올림 누적이 항등식을 깨뜨린다 | Must |
| FR-6 | 절사/반올림 방식은 `TaxLawConfig`의 설정값으로 노출한다(HALF_UP 기본). 코드 상수 금지 | Must |

### B. 멱등과 중복 방지

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-10 | 외부에서 들어오는 데이터(CSV import, 거래소 API sync, 지표 수집, 환율 수집)를 적재하는 모델은 **`(source, sourceRef)` 또는 `(자연키, asOf)` 유니크**를 반드시 가진다 | Must |
| FR-11 | worker가 쓰는 모델은 **upsert 가능**해야 한다. 같은 시간 버킷 재실행이 row를 늘리면 안 된다 | Must |
| FR-12 | Postgres의 nullable 유니크는 NULL 중복을 허용한다. 기존 row에 `sourceRef = null`을 넣어도 제약 위반이 없다는 점을 이용해 **기존 데이터를 건드리지 않고** 유니크를 추가한다 | Must |
| FR-13 | `sourceRef`는 외부 시스템의 안정된 식별자만 쓴다. **CSV 행 번호를 섞지 않는다** — 섞으면 재업로드 시 중복 방지가 깨진다 | Must |

### C. 시각

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-20 | 모든 `DateTime`은 UTC로 저장한다 | Must |
| FR-21 | **세금 기준일은 예외**다. `taxFreeDeadline`, `deemedCostBasisDate`, `settlementDate`, `lastTradeDate`는 tz 오프셋이 포함된 값을 저장하고, 계산은 그 오프셋 기준으로 한다 | Must |
| FR-22 | 주차 경계(`weekOf`)는 **KST 월요일 00:00** 기준 날짜로 저장한다. 일요일 23:59 매수와 월요일 00:01 매수의 귀속 주차가 갈린다 | Must |
| FR-23 | 지표 `asOf`는 **날짜(date)** 단위다. 하루 1회 수집이므로 시각까지 저장하면 멱등 유니크가 깨진다 | Must |

### D. JSON

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-30 | `Json` 컬럼은 **표시용 스냅샷 전용**이다. 허용: `seriesJson`, `bandConfigJson`, `hitsJson`, `missesJson`, `scopesJson`, `cipherMeta` | Must |
| FR-31 | **쿼리 조건·정렬·집계 대상이 되는 값은 반드시 별도 컬럼**으로 승격한다. 예: `InvestmentInsight.payload.kind`를 조건으로 쓰는 현재 패턴을 `kind` 컬럼으로 승격한다(DB-REQ-013) | Must |
| FR-32 | 새 코드에서 `payload` JSON을 조건으로 뒤지는 쿼리를 추가하지 않는다 | Must |

### E. 인덱스

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-40 | 신규 모델은 **그 모델을 읽는 쿼리를 스펙에 함께 적고**, 그 쿼리를 덮는 인덱스만 만든다. 추측 인덱스 금지 | Must |
| FR-41 | 정렬 쿼리는 정렬 컬럼을 인덱스 끝에 포함한다(`@@index([userId, attributedPnl])` 형태) | Must |
| FR-42 | 시계열 조회는 `(자연키, timeframe, timestamp)` 복합 인덱스를 쓴다. 기존 `PriceHistory`·`TechnicalIndicator` 패턴을 따른다 | Must |

### F. 보존과 삭제

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-50 | **원장 3종(`PortfolioTransaction`, `PortfolioHolding`, `PriceHistory`)은 어떤 마이그레이션에서도 row 손실이 없어야 한다.** 마이그레이션 전후 `count(*)` 비교가 수용 기준 | Must |
| FR-51 | **화면이 없는 모델을 지우지 않는다.** 되살리는 비용이 커밋 하나여야 한다(FEATURE-000 보류 판정) | Must |
| FR-52 | `YearEndPriceSnapshot`은 **수정·삭제 불가**다. 수집 후 변경 시도는 애플리케이션에서 거부하고 감사 로그를 남긴다(DB-REQ-007) | Must |
| FR-53 | 사용자 삭제(`onDelete`) 정책: 원장·스냅샷 계열은 `Cascade`, 발급 이력(`InviteCode.usedByUserId`)은 `SetNull` | Must |
| FR-54 | 거래소 API 키(`UpbitApiKey.secretCipher`)는 **암호문만** 저장한다. 평문 컬럼을 만들지 않는다 | Must |

### G. drop 안전 절차

| ID | 정책 | 우선순위 |
|---|---|---|
| FR-60 | 모델·컬럼 drop 전에 해당 심볼의 코드 참조가 0임을 grep으로 확인하고 **결과를 마이그레이션 커밋 메시지에 남긴다** | Must |
| FR-61 | drop 포함 마이그레이션 전에 `pg_dump -Fc` 스냅샷을 남기고 **복원 테스트를 1회** 수행한다. 스냅샷 경로를 커밋에 기록한다 | Must |
| FR-62 | **마이그레이션 1개 = 목적 1개.** 한 마이그레이션에 drop과 add를 섞지 않는다. 이름은 `20260909_<purpose>` | Must |

## Acceptance Criteria

- [ ] DB-REQ-004 이후 신규 금액 컬럼에 `Float`가 0건이다 (`grep "Float" schema.prisma`로 신규 블록 확인)
- [ ] 외부 유입 모델 전부에 멱등 유니크가 있다: `CashFlow`, `FxRate`, `IndicatorSnapshot`, `YearEndPriceSnapshot`, `PortfolioTransaction(source,sourceRef)`
- [ ] 같은 CSV를 2회 업로드해 `inserted=0, duplicated=N`
- [ ] 같은 날 `indicator-sync`를 3회 실행해 `IndicatorSnapshot` row가 1건
- [ ] `weekOf`가 KST 월요일 날짜로 저장된다 (일요일 23:59 매수 귀속 주차 테스트)
- [ ] 신규 코드에 `payload` JSON 조건 쿼리가 0건이다
- [ ] 원장 3종 row 수가 전체 마이그레이션 전후 동일하다
- [ ] `UpbitApiKey`에 평문 secret 컬럼이 없다
- [ ] 모든 drop 마이그레이션 커밋에 grep 결과와 `pg_dump` 경로가 있다

## Trace

| FR | 적용 대상 REQ | 검증 |
|---|---|---|
| FR-1~6 | DB-REQ-004/007/010/013 신규 금액 컬럼 | 스키마 grep + 항등식 property test (SRV-REQ-009) |
| FR-10~13 | `CashFlow`, `FxRate`, `IndicatorSnapshot`, `YearEndPriceSnapshot` | 재실행 멱등 테스트 |
| FR-20~23 | 세금·적립 모델 | 날짜 경계 테스트 (12/30·12/31, 일/월 경계) |
| FR-30~32 | `InvestmentInsight.kind` 승격 | 쿼리 플랜에 index scan |
| FR-40~42 | 전 신규 모델 | `EXPLAIN` 결과를 checklist에 첨부 |
| FR-50~54 | 원장·스냅샷·키 | row count + 암호문 확인 |
| FR-60~62 | DB-REQ-003 및 이후 drop | 커밋 메시지 감사 |

## Dependencies

- 짝: `DB-REQ-001`(스키마), `DB-REQ-003`(마이그레이션)
- 적용 대상: `DB-REQ-004`~`DB-REQ-021` 전부
- 소비: `SRV-REQ-027`(성능)이 FR-40~42의 인덱스 근거를 검증한다

## Open Questions

- 기존 `Float` 원장 컬럼을 `Decimal`로 승격하는 시점. 지금 바꾸면 `portfolio.service`·`profit-plan.service`·`behavior-coach.service`가 전부 영향을 받는다. **DB-REQ-006에서 원장 확장과 함께 하는 것이 맞는지, 아니면 계산 경로에서만 승격할지 결정 필요.**
- 세금 절사 규칙(원 단위 절사 vs 반올림)의 법령 근거. 국세청 예규 확인이 필요하고 그때까지 설정값 기본은 HALF_UP.
