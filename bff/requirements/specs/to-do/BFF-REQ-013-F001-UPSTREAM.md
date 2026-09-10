---
id: BFF-REQ-013
feature: F001
area: bff
kind: UPSTREAM
title: "F001 개입 청구서 — 서버 호출 계약 정의"
priority: critical
labels: [bff, upstream, backend-integration, streaming-proxy]
created: 2026-09-09
---

## Summary

BFF가 부르는 서버 엔드포인트와 계약. **CSV 업로드를 스트리밍 프록시**하는 것과 **현재가 보정을 위해 가격 캐시를 쓰는 것**이 이 REQ의 특징이다.

## 호출 맵

| BFF 함수 | 서버 호출 | 타임아웃 | 재시도 |
|---|---|---|---|
| `invoiceSummary` | `GET /api/invoice?window&benchmark` | 800ms | 1회 |
| `tradeAttributions` | `GET /api/invoice/trades?...` | 600ms | 1회 |
| `recomputeInvoice` | `POST /api/invoice/recompute` | 1s | **0회** |
| `ledgerHealth` | `GET /api/ledger/health` | 800ms | 1회 |
| `importLedger` | `POST /api/ledger/import` (multipart) | **60s** | **0회** |
| `reportBalance` | `POST /api/ledger/reported-balance` | 600ms | 0회 |
| `registerKey` | `POST /api/ledger/keys` | 3s | **0회** |
| `deleteKey` | `DELETE /api/ledger/keys/:provider` | 600ms | 0회 |
| `syncExchange` | `POST /api/ledger/sync` | 1s | 0회 |
| `coverage` | `GET /api/ledger/coverage` | 600ms | 1회 |
| `backfill` | `POST /api/ledger/backfill` | 1s | 0회 |
| — | **BFF 가격 캐시** (현재가 보정) | 20ms | — |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | mutation 8종은 **재시도하지 않는다.** import 재시도는 중복 적재를 유발할 수 있다(서버 유니크가 막지만 응답이 혼란스러워진다) | Must |
| FR-2 | `importLedger` 타임아웃은 **60s**다. 10,000행 파싱이 10s이고 여유를 둔다 | Must |
| FR-3 | `registerKey` 타임아웃은 **3s**다. 거래소 스코프 조회가 외부 호출이다 | Must |
| FR-4 | 서버 에러 코드를 그대로 전달: `403 SCOPE_NOT_ALLOWED` · `413` · `422` · `409` | Must |
| FR-5 | 서버 `degraded`·`reconciliation`을 그대로 전달한다 | Must |

## CSV 스트리밍 프록시 — BFF 메모리를 지킨다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `multipart/form-data`를 **스트리밍으로 서버에 넘긴다.** 파일 전체를 BFF 메모리에 올리지 않는다 | Must |
| FR-11 | 파일 크기 상한 20MB. 초과 시 **스트림을 끊고 413**을 반환한다 | Must |
| FR-12 | **BFF가 CSV를 파싱하지 않는다.** 헤더도 읽지 않는다 | Must |
| FR-13 | 업로드 중 클라이언트 연결이 끊기면 **서버 요청도 중단**한다 | Must |
| FR-14 | 업로드 요청 본문을 **로깅하지 않는다.** 거래 내역이다 | Must |

## 현재가 보정 — 가격 캐시 사용

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | BFF의 기존 가격 캐시(`market-overview.service` / `price-updater.worker`)에서 현재가를 읽는다 | Must |
| FR-21 | 캐시에 없는 심볼은 **보정하지 않는다.** 서버를 다시 부르지 않는다 — 청구서 응답 예산을 넘긴다 | Must |
| FR-22 | 캐시가 전부 비면 `priceStale: true`로 표시하고 스냅샷 값을 쓴다 | Must |
| FR-23 | 국내·미국 주식은 **가격 캐시에 없을 수 있다**(업비트 WS만 구독한다). 그 경우 스냅샷 값을 쓰고 `priceStale`을 표시한다 | Must |
| FR-24 | 보정은 **평가액 표시에만.** 확정 손익을 건드리지 않는다 | Must |

## 계약 의존 — 서버가 바뀌면 여기가 깨진다

| 서버 필드 | 변경 시 영향 |
|---|---|
| `summary.*` | 청구서 요약 카드 |
| `series[]` | 3선 그래프 |
| `biasBreakdown[]` (`none` 포함) | 편향 아코디언 + 합계 검증 |
| `topLosses[]` / `topGains[]` | **대칭 렌더.** `topGains` 누락은 정책 위반 |
| `reconciliation.residual` | **잔차 노출.** 누락은 정책 위반 |
| `interpolatedDays[]` | 결측 경고 |
| `unsupportedTransactions[]` | 미지원 거래 안내 |
| `narrative` | LLM 3문장 (null 허용) |
| `benchmarkSymbol` | Do-Nothing 툴팁 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `reconciliation`이 없으면 **응답을 내보내지 않고 `degraded`로 처리**한다. 잔차 노출은 정책이다 | Must |
| FR-31 | `topGains`가 없으면 **빈 배열 + `hasGains: false`** 로 만든다. 필드 자체를 빼지 않는다 | Must |
| FR-32 | 그 외 필드가 없으면 기본값을 만들지 않고 `unavailable`로 처리한다 | Must |
| FR-33 | 계약 스냅샷 테스트를 둔다 | Must |

## Acceptance Criteria

- [ ] mutation 8종이 재시도되지 않는다
- [ ] `importLedger` 타임아웃이 60s다
- [ ] `registerKey` 타임아웃이 3s다
- [ ] 서버 에러 코드 4종이 그대로 전달된다
- [ ] **20MB CSV가 BFF 메모리를 통과하지 않는다** (메모리 프로파일 확인)
- [ ] 20MB 초과 시 413이고 스트림이 끊긴다
- [ ] BFF가 CSV를 파싱하지 않는다 (코드 검사)
- [ ] 업로드 중 클라이언트 연결 종료 시 서버 요청이 중단된다
- [ ] 업로드 본문이 로그에 0건이다
- [ ] 현재가 보정이 BFF 가격 캐시를 쓰고 서버를 다시 부르지 않는다
- [ ] 캐시에 없는 심볼이 보정되지 않는다
- [ ] 캐시가 비면 `priceStale: true`다
- [ ] 국내·미국 주식이 `priceStale`로 처리된다
- [ ] 보정이 확정 손익을 변경하지 않는다
- [ ] **`reconciliation` 누락 시 `degraded`로 처리된다**
- [ ] `topGains` 누락 시 빈 배열 + `hasGains: false`다
- [ ] 계약 스냅샷 테스트가 있다

## Dependencies

- **선행:** `SRV-REQ-013`(서버 계약)
- **짝:** `BFF-REQ-011` · `012` · `014`
- **규칙:** `backend-integration.md`

## Open Questions

- 국내·미국 주식 현재가를 BFF가 갖고 있지 않다. **KIS 시세를 BFF가 구독할지, 서버가 스냅샷에 최신가를 넣을지** 결정 필요. 후자가 더 단순하다.
- 업로드 진행률을 프론트에 어떻게 알릴지. 스트리밍 프록시에서는 서버 진행 상황을 모른다.
