---
id: SRV-REQ-013
feature: F001
area: srv
kind: API
title: "F001 개입 청구서 — REST 계약 정의"
priority: critical
labels: [api, rest, contract, swagger]
created: 2026-09-09
---

## Summary

`ledger` · `invoice` · `fx` 컨텍스트의 HTTP 노출면을 정의한다. 컨텍스트 이름이 곧 리소스 경로다.

## 엔드포인트

### `invoice`

| Method | Path | Auth | Request | Response | 비고 |
|---|---|---|---|---|---|
| GET | `/api/invoice` | Y | `?window=30\|90\|180\|365\|all&benchmark=single\|perSymbol` | `InvoiceResult` | 기본 `window=180` |
| GET | `/api/invoice/trades` | Y | `?window&bias&sort=pnl_asc\|pnl_desc&limit&cursor` | `{ items: TradeAttribution[], nextCursor }` | 커서 페이징 |
| GET | `/api/invoice/snapshot/latest` | Y | `?window` | `InvoiceSnapshot \| null` | 50ms 예산 |
| POST | `/api/invoice/recompute` | Y | `{ window? }` | `202 { jobId }` | **비동기.** 동기로 만들지 않는다 |

### `ledger`

| Method | Path | Auth | Request | Response | 비고 |
|---|---|---|---|---|---|
| POST | `/api/ledger/import` | Y | `multipart` — `tradesCsv`, `cashflowCsv?`, `source` | `{ inserted, duplicated, failed, failures[], unsupported[], holdingDiff[] }` | 부분 성공 |
| GET | `/api/ledger/health` | Y | — | `{ computedHoldings[], reportedHoldings[], maxDiffRate, missingCandleRate, degraded, degradedReasons[] }` | |
| POST | `/api/ledger/reported-balance` | Y | `[{ symbol, quantity }]` | `{ maxDiffRate }` | 사용자 입력 잔고 |
| POST | `/api/ledger/keys` | Y | `{ provider, accessKey, secretKey }` | `{ scopes[], accepted }` / **`403 SCOPE_NOT_ALLOWED`** | 스코프 검사 |
| DELETE | `/api/ledger/keys/:provider` | Y | — | `204` | |
| POST | `/api/ledger/sync` | Y | `{ provider }` | `202 { jobId }` | 조회 전용 |
| GET | `/api/ledger/coverage` | Y | `?symbol` | `{ missingDays[], rate }` | 일봉 결측 |
| POST | `/api/ledger/backfill` | Y | `{ symbol, from, to }` | `202 { jobId }` | |

### `fx`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/fx/rate` | Y | `?base=USD&quote=KRW&date=&kind=settlement_base` | `{ rate, source, rateDate } \| 404` |
| GET | `/api/fx/coverage` | Y | `?from&to` | `{ missingDates[] }` |

## 응답 계약

```ts
type InvoiceResult = {
  window: string;
  range: { from: string; to: string };
  computedAt: string;
  degraded: boolean;
  degradedReasons: string[];          // ledger_mismatch | missing_candles | fx_missing | reconciliation_out_of_tolerance

  summary: {
    actualValue: number;              // 원 단위 정수
    doNothingValue: number;
    mechanicalDcaValue: number;
    interventionPnl: number;
    disciplinePnl: number;
    totalFee: number;
    tradeCount: number;
    netDeposit: number;
  };

  series: Array<{ date: string; actual: number; doNothing: number; mechanicalDca: number }>;

  biasBreakdown: Array<{ label: string; count: number; sumPnl: number; avgPnl: number }>;
  mostExpensiveHabit: { label: string; sumPnl: number; count: number } | null;
  topLosses: TradeAttribution[];      // 최대 3
  topGains: TradeAttribution[];       // 최대 3 — 손실과 대칭
  feeLine: { count: number; total: number; perTradeAvg: number };

  reconciliation: {
    sumAttributedPnl: number;
    sumDoNothingPnl: number;
    interventionPnl: number;
    residual: number;                 // 항상 포함. 숨기지 않는다
    withinTolerance: boolean;
  };

  interpolatedDays: string[];
  unsupportedTransactions: Array<{ transactionId: string; reason: string }>;
  narrative: string[] | null;         // LLM 3문장. 실패 시 null
};

type TradeAttribution = {
  transactionId: string;
  symbol: string;
  assetType: 'crypto' | 'kr_stock' | 'us_stock';
  transactionType: 'buy' | 'sell';
  transactionDate: string;
  settlementDate: string;
  quantity: number;
  price: number;                      // 원화 단가
  currentPrice: number;
  fee: number;
  attributedPnl: number;
  biasLabels: string[];               // 코드만. 문구는 프론트가 만든다
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 금액은 **원 단위 정수**다. 반올림은 `presentation`에서 1회만 | Must |
| FR-2 | `reconciliation`을 **항상 포함**한다. 잔차를 숨기지 않는다 | Must |
| FR-3 | 잔차 초과 시 **500이 아니라 200 + `degraded: true`** 로 응답한다 | Must |
| FR-4 | `degradedReasons`는 **코드**다. 사용자 문구는 프론트가 만든다 | Must |
| FR-5 | `biasLabels`는 **코드**다. 인격 평가 문구를 서버가 만들지 않는다 | Must |
| FR-6 | 스냅샷 미스 시 비동기 계산을 띄우고 **마지막 스냅샷 + `degraded`** 를 즉시 반환한다. 요청을 1.5s 붙잡지 않는다 | Must |
| FR-7 | `POST /recompute`·`/sync`·`/backfill`은 **202 + jobId**다. 수 초를 넘는 작업을 동기로 만들지 않는다 | Must |
| FR-8 | `series`는 **다운샘플링**해서 준다. 기간 `all`이면 수천 개다 | Must |
| FR-9 | 목록은 전부 **커서 페이징**이다 | Must |
| FR-10 | `403 SCOPE_NOT_ALLOWED`는 `ErrorKind.BLOCKED`로 매핑된다. 도메인이 HTTP status를 모른다 | Must |
| FR-11 | 응답에 거래소 키·계좌 식별자를 담지 않는다. `accessKeyMasked`만 | Must |
| FR-12 | **주문·출금 엔드포인트를 만들지 않는다** | Must |
| FR-13 | Swagger JSDoc을 라우터에 작성한다. **응답 예시에 실제 금액을 넣지 않는다** | Must |

## Acceptance Criteria

- [ ] 위 엔드포인트 14개가 등록되고 각각 200/202/204를 반환한다
- [ ] `window` 5개 값이 전부 동작한다
- [ ] `reconciliation`이 모든 청구서 응답에 있다
- [ ] 잔차를 강제로 어긋나게 만들면 200 + `degraded: true`다 (500이 아니다)
- [ ] 스냅샷 미스 시 응답이 300ms 이내에 오고 `degraded`가 붙는다
- [ ] `recompute`·`sync`·`backfill`이 202를 반환한다
- [ ] `series` 길이가 기간 `all`에서도 다운샘플링 상한 이하다
- [ ] 주문·출금 권한 키 등록 시 403 `SCOPE_NOT_ALLOWED`다
- [ ] 응답 어디에도 secret 평문·계좌 식별자가 없다
- [ ] 주문·출금 경로가 0건이다 (라우터 grep)
- [ ] 금액이 전부 정수다
- [ ] Swagger가 렌더되고 예시에 실제 금액이 없다
- [ ] 커서 페이징이 동작한다 (다음 페이지 중복·누락 0건)

## Dependencies

- **선행:** `SRV-REQ-012`(도메인 로직) · `SRV-REQ-006`(DDD)
- **소비:** `BFF-REQ-013`(F001 UPSTREAM)이 이 계약을 부른다
- **규칙:** `ddd-presentation.md` · `api-contract.md` · `swagger.md`

## Open Questions

- `series` 다운샘플링 상한. 화면 폭 기준 200~400점이 기본안.
- `jobId` 상태 조회 엔드포인트가 필요한가. 프론트가 폴링할지, 완료를 알림으로 받을지 → `BFF-REQ-013`에서 결정.
- `/api/ledger/keys`의 `provider`를 경로 파라미터로 할지 body에 둘지. DELETE는 경로가 자연스럽다.
