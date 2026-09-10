---
id: BFF-REQ-012
feature: F001
area: bff
kind: API
title: "F001 개입 청구서 — 프론트 대면 계약 정의"
priority: critical
labels: [bff, api, contract, viewmodel, invoice]
created: 2026-09-09
---

## Summary

청구서·원장 화면이 쓰는 뷰모델 계약. 웹은 블록별, 모바일은 집계.

## 엔드포인트

| Method | Path | 용도 | 소비자 |
|---|---|---|---|
| GET | `/api/app/invoice` | 청구서 (집계) | 모바일 · 웹(단일 블록이면 이것) |
| GET | `/api/app/invoice/summary` | 요약 블록 | 웹 |
| GET | `/api/app/invoice/breakdown` | 편향 집계 블록 | 웹 |
| GET | `/api/app/invoice/trades` | 거래 귀속 목록 (커서) | 웹 · 모바일 |
| POST | `/api/app/invoice/recompute` | 재계산 요청 | |
| GET | `/api/app/ledger/health` | 원장 건강도 | |
| POST | `/api/app/ledger/import` | CSV 업로드 (multipart) | |
| POST | `/api/app/ledger/reported-balance` | 실제 잔고 입력 | |
| POST | `/api/app/ledger/keys` · DELETE `/keys/:provider` | 거래소 키 | |
| POST | `/api/app/ledger/sync` | 조회 전용 동기화 | |
| GET | `/api/app/ledger/coverage` · POST `/backfill` | 일봉 결측·백필 | |

## 뷰모델

```ts
type InvoiceViewModel = {
  window: '30' | '90' | '180' | '365' | 'all';
  range: { from: string; to: string };
  computedAt: string;                 // 스냅샷 생성 시각
  priceAdjustedAt: string | null;     // 현재가 보정 시각
  priceStale: boolean;
  degraded: boolean;
  degradedReasons: string[];
  degradedBlocks: string[];

  summary: {
    actualValue: number | null;       // 실패 시 null (0 아님)
    doNothingValue: number | null;
    mechanicalDcaValue: number | null;
    interventionPnl: number | null;
    disciplinePnl: number | null;
    totalFee: number | null;
    tradeCount: number;
    netDeposit: number | null;
    status: 'ok' | 'unavailable';
  };

  series: Array<{ date: string; actual: number; doNothing: number; mechanicalDca: number }>;

  biasBreakdown: Array<{ label: string; count: number; sumPnl: number; avgPnl: number }>;  // none 포함
  mostExpensiveHabit: { label: string; sumPnl: number; count: number } | null;
  topLosses: TradeAttributionVM[];
  topGains: TradeAttributionVM[];
  hasGains: boolean;                  // 대칭 렌더 판단
  feeLine: { count: number; total: number; perTradeAvg: number } | null;

  reconciliation: {
    sumAttributedPnl: number; sumDoNothingPnl: number;
    interventionPnl: number; residual: number; withinTolerance: boolean;
  };

  interpolatedDays: string[];
  unsupportedTransactions: Array<{ transactionId: string; reasonCode: string }>;
  narrative: string[] | null;
  benchmarkSymbol: string;
};

type LedgerHealthViewModel = {
  computedHoldings: Array<{ symbol: string; assetType: string; quantity: number }>;
  reportedHoldings: Array<{ symbol: string; quantity: number }>;
  diffs: Array<{ symbol: string; diffRate: number }>;
  maxDiffRate: number | null;
  missingCandleRate: number | null;
  degraded: boolean;
  degradedReasons: string[];
  exchangeKeys: Array<{ provider: string; accessKeyMasked: string; scopes: string[]; lastSyncedAt: string | null }>;
  status: 'ok' | 'unavailable';
};

type ImportResultViewModel = {
  inserted: number; duplicated: number; failed: number;
  failures: Array<{ row: number; reasonCode: string }>;      // 최대 10
  failuresCsvUrl: string | null;
  unsupported: Array<{ row: number; reasonCode: string }>;
  holdingDiff: Array<{ symbol: string; before: number; after: number }>;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **금액은 실패 시 `null`이다.** `0`을 쓰지 않는다 | Must |
| FR-2 | `reconciliation`을 항상 포함한다 | Must |
| FR-3 | `topGains`를 항상 포함하고 `hasGains`로 비었음을 명시한다 | Must |
| FR-4 | `biasBreakdown`에 `none`을 포함한다 | Must |
| FR-5 | `reasonCode`·`degradedReasons`는 **코드**다. 문구는 프론트 | Must |
| FR-6 | `priceAdjustedAt`·`priceStale`로 **어느 시점 가격인지** 알린다 | Must |
| FR-7 | `series`는 서버가 다운샘플링한 것을 그대로. BFF가 다시 자르지 않는다 | Must |
| FR-8 | 목록은 **커서 페이징**. `nextCursor`를 준다 | Must |
| FR-9 | `recompute`·`sync`·`backfill`은 **202 + jobId** | Must |
| FR-10 | 응답에 secret·accessKey 평문이 0건. `accessKeyMasked`만 | Must |
| FR-11 | `403 SCOPE_NOT_ALLOWED`를 그대로 전달 | Must |
| FR-12 | 뷰모델 타입을 `packages/core`로 공유 | Should |
| FR-13 | `benchmarkSymbol`을 전달한다. 화면이 "다 BTC에 넣고 가만히 있었다면" 툴팁을 만든다 | Must |

## Acceptance Criteria

- [ ] 엔드포인트 12개가 등록된다
- [ ] 블록 엔드포인트 합이 집계 응답과 필드 단위로 동일하다
- [ ] 금액 실패 시 `null`이고 `0`이 0건이다
- [ ] `reconciliation`이 항상 있다
- [ ] `topGains`가 항상 있고 `hasGains`가 있다
- [ ] `biasBreakdown`에 `none`이 있다
- [ ] 문구 필드가 전부 코드다 (사용자 문장 0건)
- [ ] `priceAdjustedAt`·`priceStale`이 있다
- [ ] `series` 길이가 서버 값과 같다 (BFF 재가공 0건)
- [ ] 커서 페이징이 동작한다 (중복·누락 0건)
- [ ] `recompute`·`sync`·`backfill`이 202 + jobId다
- [ ] 응답에 secret 평문이 0건이다
- [ ] `403 SCOPE_NOT_ALLOWED`가 그대로 전달된다
- [ ] `benchmarkSymbol`이 있다
- [ ] 20MB CSV 업로드가 성공하고 초과 시 413이다

## Dependencies

- **선행:** `BFF-REQ-011` · `SRV-REQ-013`
- **소비:** `FE-REQ-016`(F001 API) · `RN-REQ-010`(F001 API)

## Open Questions

- 웹이 블록 엔드포인트를 쓸지 집계를 쓸지. 청구서는 **소스가 사실상 2개(청구서·원장건강도)** 뿐이라 블록 분리 이득이 작다 → **집계 1콜 + 원장건강도 별도**가 기본안.
- `jobId` 상태 조회 엔드포인트가 필요한가.
- 실패 행 CSV URL의 만료 정책.
