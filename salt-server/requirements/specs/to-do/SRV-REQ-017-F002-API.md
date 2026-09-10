---
id: SRV-REQ-017
feature: F002
area: srv
kind: API
title: "F002 세금 마감 콕핏 — REST 계약 정의"
priority: critical
labels: [api, rest, contract, tax]
created: 2026-09-09
---

## Summary

`tax` 컨텍스트의 HTTP 노출면. **계산 전제를 전부 응답에 담는 것**이 이 계약의 특징이다 — 세율·공제·시행일·기준일·환율 소스가 화면에 노출되어야 한다.

## 엔드포인트

| Method | Path | Auth | Request | Response | 비고 |
|---|---|---|---|---|---|
| GET | `/api/tax/cockpit` | Y | `?taxYear=2026` | `TaxCockpitResult` | 600ms 예산 |
| GET | `/api/tax/deadlines` | Y | `?taxYear` | `{ deadlines[] }` | **D-Day만.** 클라이언트 즉시 렌더용 |
| POST | `/api/tax/harvest-solve` | Y | `{ taxYear, targetTaxableBase?, maxSymbols?, lastSettlementDate? }` | `{ candidates: HarvestCandidate[] }` | 500ms 예산 |
| POST | `/api/tax/crypto-scenario` | Y | `{ symbol, quantity, yearEndPriceAssumption, costBasisMethod }` | `CryptoScenarioResult` | 파라미터 함께 반환 |
| GET | `/api/tax/fx-trap` | Y | `?taxYear&assumedSellRate?` | `{ items: FxTrapItem[] }` | |
| GET | `/api/tax/cost-basis/:assetType/:symbol` | Y | `?method=moving_average\|fifo\|both` | `CostBasisResult` | 집계값만 |
| GET | `/api/tax/settlement-calendar` | Y | `?market&from&to` | `{ days[] }` | |
| GET/PATCH | `/api/tax/law-config` | Y | `{ assetClass, ...params }` | `{ config[], recalculated: true }` | 상태·파라미터 수동 갱신 |
| GET | `/api/tax/archive` | Y | — | `{ files[], snapshotStatus, snapshotScheduledAt }` | |
| POST | `/api/tax/archive/download` | Y | `{ years[], sources[] }` | `{ signedUrl, expiresAt }` | **5분 만료** |
| POST | `/api/tax/snapshot/collect` | Y | `{ snapshotDate?, dryRun? }` | `202 { jobId }` | 워커가 부르는 것과 같은 유스케이스 |
| POST | `/api/tax/snapshot/manual` | Y | `{ prices: [{symbol, price}], reason }` | `{ accepted }` / `403 SNAPSHOT_IMMUTABLE` | 수집 실패 시에만 |
| POST | `/api/tax/cost-basis/recompute` | Y | — | `202 { jobId }` | 비동기 |

## 응답 계약

```ts
type TaxCockpitResult = {
  taxYear: number;
  computedAt: string;
  degraded: boolean;
  degradedReasons: string[];        // fx_missing | ledger_mismatch | calendar_missing
                                    // | cost_basis_recomputing | snapshot_missing | lot_mismatch
  unsupported: string[];            // staking_income | nft | foreign_tax_credit | derivatives | lending

  deadlines: Array<{
    assetClass: 'crypto' | 'us_stock' | 'kr_stock';
    taxable: boolean;               // kr_stock = false
    lastTradeDate: string | null;   // "2026-12-30"
    recommendedDate: string | null; // "2026-12-29"
    settlementBasis: string | null; // "T+1"
    daysRemaining: number | null;
    noteCode: string;               // 코드. 문구는 프론트가 만든다
  }>;

  usStock: {
    realizedGainKrw: number;        // 결제일 기준
    basicDeduction: number;
    taxableBase: number;
    estimatedTax: number;
    combinedRate: number;
    unrealizedLossKrw: number;
    harvestPotentialTax: number;
    fxMissingSymbols: string[];
  } | null;

  crypto: {
    lawStatus: 'enforced' | 'under_review' | 'deferred' | 'repealed';
    effectiveFrom: string | null;
    taxFreeDeadline: string | null; // tz 오프셋 포함
    deemedCostBasisDate: string | null;
    basisNote: string | null;
    sourceUrl: string | null;
    holdings: Array<{
      symbol: string;
      quantity: number;
      currentPrice: number;
      costBasis: {
        movingAverage: { unitCostKrw: number; totalKrw: number; gainKrw: number };
        fifo:          { unitCostKrw: number; totalKrw: number; gainKrw: number };
        selectedMethod: 'movingAverage' | 'fifo';
      };
      scenarios: {
        sellNow:            ScenarioResult;   // taxFree: true
        holdThroughYearEnd: StepUpResult;
        sellNextYear:       ScenarioResult;
      };
      breakEvenYearEndPrice: number | null;
      stepUpSaving: number;
      scenarioParams: ScenarioParams;         // 클라이언트 재계산용
    }>;
  } | null;

  krStock: {
    capitalGainTaxable: false;
    majorShareholderThreshold: number;
    largestPositionValue: number;
    exceedsThreshold: boolean;
    transactionTaxRate: number;
    estimatedTransactionTaxOnFullExit: number;
    dividendYtd: number;
    dividendWithholdingRate: number;
    financialIncomeYtd: number;
    financialIncomeThreshold: number;
    remainingToThreshold: number;
  } | null;

  archive: {
    files: Array<{ id: string; source: string; kind: string; year: number; sizeBytes: number; storedAt: string }>;
    snapshotStatus: 'scheduled' | 'collected' | 'failed' | 'manual';
    snapshotScheduledAt: string;    // "2027-01-01T00:10:00+09:00"
  };

  lawConfigShown: Record<string, string | number>;   // 계산 전제 전부
  disclaimer: string;
};

type HarvestCandidate = {
  strategy: 'min_amount' | 'min_symbols' | 'exact_deduction';
  sells: Array<{
    symbol: string;
    quantity: number;               // 부분 매도 수량
    priceUsd: number;
    realizedLossKrw: number;
    fxAssumedRate: number;
  }>;
  taxableBaseAfter: number;
  estimatedTaxAfter: number;
  taxSaved: number;
  mustSellBy: string;
  caveatCodes: string[];            // 코드. 문구는 프론트
  isOptimal: boolean;               // 탐욕 근사이면 false
};

type FxTrapItem = {
  symbol: string;
  pnlUsd: number;
  pnlKrw: number;
  signMismatch: true;
  buySettlementRate: number;
  assumedSellSettlementRate: number;
  rateIsAssumed: true;
};

type ScenarioResult = { realizedGain: number; taxableBase: number; tax: number; netProceeds: number; taxFree: boolean; assumptionCodes: string[] };
type StepUpResult   = { yearEndPriceAssumption: number; deemedCostBasis: number; stepUpAmount: number; futureTaxSaved: number };
type ScenarioParams = { taxRate: number; localTaxRate: number; basicDeduction: number; actualUnitCostKrw: number; quantity: number; roundingMode: string };
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`lawConfigShown`을 항상 포함**한다. 세율·공제·시행일·기준일·T+N·권고버퍼·환율소스·반올림방식이 전부 들어간다 | Must |
| FR-2 | **`disclaimer`를 항상 포함**한다 | Must |
| FR-3 | `GET /api/tax/deadlines`를 **별도 엔드포인트로 둔다.** 콕핏 전체(600ms)를 기다리지 않고 D-Day를 먼저 렌더한다 | Must |
| FR-4 | `taxFreeDeadline`·`deemedCostBasisDate`는 **tz 오프셋 포함 문자열**로 준다. 날짜 경계가 법적 의미를 갖는다 | Must |
| FR-5 | `noteCode`·`caveatCodes`·`assumptionCodes`·`degradedReasons`는 **코드**다. 사용자 문구는 프론트가 만든다 | Must |
| FR-6 | `crypto-scenario`는 **`scenarioParams`를 함께 반환**한다. 클라이언트가 슬라이더로 재계산할 수 있어야 한다(60fps 요구) | Must |
| FR-7 | 클라이언트 재계산 결과가 **서버 계산과 원 단위까지 일치**해야 한다. `roundingMode`를 파라미터에 포함한다 | Must |
| FR-8 | `fx-trap`의 매도 환율은 **가정값**이고 `rateIsAssumed: true`로 표시한다 | Must |
| FR-9 | 솔버가 최적해를 보장하지 않으면 `isOptimal: false`로 표시한다. **근사임을 숨기지 않는다** | Must |
| FR-10 | `cost-basis`는 **집계값만** 준다. lot 개별 row를 응답에 담지 않는다 | Must |
| FR-11 | `archive/download`는 **5분 만료 서명 URL**이다 | Must |
| FR-12 | `snapshot/manual`은 이미 행이 있으면 `403 SNAPSHOT_IMMUTABLE`이다 | Must |
| FR-13 | `snapshot/collect`에 `dryRun` 플래그를 둔다. 12월 리허설용 | Must |
| FR-14 | `cost-basis/recompute`는 **202 + jobId**다 | Must |
| FR-15 | **세금 금액을 애플리케이션 로그에 남기지 않는다** | Must |
| FR-16 | `kr_stock`은 `capitalGainTaxable: false`를 명시하고 양도차익 필드를 아예 담지 않는다 | Must |
| FR-17 | Swagger JSDoc 작성. **응답 예시에 실제 금액을 넣지 않는다** | Must |

## Acceptance Criteria

- [ ] 엔드포인트 13개가 등록되고 각각 200/202를 반환한다
- [ ] 모든 세금 응답에 `lawConfigShown`과 `disclaimer`가 있다
- [ ] `GET /api/tax/deadlines`가 콕핏보다 빠르게 응답한다 (100ms 이내)
- [ ] `taxFreeDeadline`에 tz 오프셋(`+09:00`)이 포함된다
- [ ] 응답의 문구 필드가 전부 코드이고 사용자 문장이 0건이다
- [ ] `crypto-scenario`가 `scenarioParams`를 반환한다
- [ ] **클라이언트 재계산 결과가 서버 계산과 원 단위까지 일치한다** (경계값 10케이스)
- [ ] `fx-trap`의 매도 환율에 `rateIsAssumed: true`가 있다
- [ ] 솔버 근사 시 `isOptimal: false`다
- [ ] `cost-basis` 응답에 lot 개별 row가 0건이다
- [ ] `archive/download` URL이 5분 후 만료된다
- [ ] `snapshot/manual` 2회 호출 시 403 `SNAPSHOT_IMMUTABLE`이다
- [ ] `dryRun`이 동작하고 실제 스냅샷을 만들지 않는다
- [ ] `recompute`가 202를 반환한다
- [ ] 로그에 세금 금액이 0건이다
- [ ] `krStock` 응답에 양도차익 필드가 0건이다
- [ ] Swagger가 렌더되고 예시에 실제 금액이 없다

## Dependencies

- **선행:** `SRV-REQ-016`(도메인 로직) · `SRV-REQ-006`(DDD)
- **소비:** `BFF-REQ-017`(F002 UPSTREAM)
- **규칙:** `ddd-presentation.md` · `api-contract.md`

## Open Questions

- `GET /api/tax/deadlines`를 인증 없이 열지. D-Day는 개인 정보가 아니지만 `TaxLawConfig`가 사용자별이다 → **인증 필요**가 기본안.
- 클라이언트 재계산(FR-7)의 일치 검증을 어디까지 할지. 슬라이더를 놓을 때만 서버와 대조하는 것이 기본안.
- 솔버의 `targetTaxableBase` 기본값. 0이 기본이지만 사용자가 "공제 한도까지 채우기"를 원할 수도 있다.
