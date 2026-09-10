---
id: BFF-REQ-011
feature: F001
area: bff
kind: FUNC
title: "F001 개입 청구서 — BFF 조립 로직 정의 (스냅샷 + 현재가 보정 · 원장 건강도)"
priority: critical
labels: [bff, viewmodel, snapshot, degraded, upload]
created: 2026-09-09
---

## Summary

청구서 뷰모델을 조립한다. 특징은 **스냅샷을 먼저 그리고 현재가만 실시간 보정**하는 것, 그리고 **잔차·원장 오차·결측을 숨기지 않고 전달**하는 것이다.

## 블록 분해

| 블록 | 소스 | 예산 | 비고 |
|---|---|---|---|
| `summary` | `GET /api/invoice` (스냅샷 기반) | 300ms | 스냅샷 미스면 `degraded` |
| `series` | 같은 응답 | — | 다운샘플링된 것을 그대로 |
| `biasBreakdown` | 같은 응답 | — | |
| `topLosses` / `topGains` | 같은 응답 | — | **대칭 렌더 보장** |
| `reconciliation` | 같은 응답 | — | **항상 포함** |
| `ledgerHealth` | `GET /api/ledger/health` | 300ms | 별도 호출 |
| `trades` | `GET /api/invoice/trades` | 200ms | 커서 페이징 |
| `currentPrices` | BFF 가격 캐시 / WS | 20ms | **보정용** |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 블록 함수를 개별 export한다: `invoiceSummary` · `ledgerHealth` · `tradeAttributions` | Must |
| FR-2 | 집계는 `Promise.allSettled`. `Promise.all` 금지 | Must |
| FR-3 | 블록 실패 시 `status: 'unavailable'` + `degradedBlocks[]` | Must |
| FR-4 | **금액 블록 실패 시 `0`을 내려보내지 않는다.** `null` | Must |
| FR-5 | 서버 호출마다 타임아웃. 블록 예산보다 짧게 | Must |
| FR-6 | mutation(import·키 등록·sync·recompute)은 재시도하지 않는다 | Must |

## 현재가 보정 — BFF가 하는 유일한 값 변경

스냅샷은 생성 시점(월요일 09:00)의 가격으로 계산됐다. 화면은 지금 가격을 보여줘야 한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 스냅샷의 `actualValue`를 **BFF 가격 캐시의 현재가로 보정**한다. 보정 대상은 **보유 평가액뿐**이고 확정된 과거 손익은 건드리지 않는다 | Must |
| FR-11 | 보정 사실을 `priceAdjustedAt`으로 응답에 표시한다. **어느 시점 가격인지 화면이 알아야 한다** | Must |
| FR-12 | **`interventionPnl`·`disciplinePnl`·`attributedPnl`을 BFF가 재계산하지 않는다.** 그건 서버 계산이다. 보정은 평가액 표시에만 | Must |
| FR-13 | 가격 캐시가 비어 있으면 **보정하지 않고** 스냅샷 값을 쓰고 `priceStale: true`를 표시한다 | Must |
| FR-14 | 보정 로직에 세율·수수료·환율이 들어가면 그것은 계산이다. **BFF에 그런 코드가 생기면 서버 계약이 부족하다는 신호다** | Must |

## 잔차와 degraded — 숨기지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `reconciliation`을 **모든 청구서 응답에 포함**한다. 필드를 빼지 않는다 | Must |
| FR-21 | 서버가 `degraded: true`를 주면 그대로 전달한다. **BFF가 판단하지 않는다** | Must |
| FR-22 | `degradedReasons` 코드를 그대로 전달한다: `ledger_mismatch` · `missing_candles` · `fx_missing` · `reconciliation_out_of_tolerance` · `snapshot_missing` | Must |
| FR-23 | `interpolatedDays[]`와 `unsupportedTransactions[]`를 전달한다. **결측과 미지원을 숨기면 사용자가 금액을 신뢰할 근거를 잃는다** | Must |
| FR-24 | `ledgerHealth`의 `maxDiffRate`를 그대로 전달한다. 임계 판정(0.5%)은 서버가 한다 | Must |

## 대칭 렌더 보장

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `topLosses`와 `topGains`를 **둘 다** 전달한다. `topGains`가 비어도 필드를 빼지 않는다 | Must |
| FR-31 | `topGains`가 비면 그 사실을 `hasGains: false`로 명시한다. 화면이 "이 기간 이익 항목이 없습니다 + 기계적 적립 트랙 비교"를 렌더할 근거가 된다 | Must |
| FR-32 | `biasBreakdown`에 `none` 라벨을 포함한다. 합계 검증의 근거다 | Must |

## CSV 업로드

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `multipart/form-data`를 서버로 **스트리밍 프록시**한다. BFF가 파일 전체를 메모리에 올리지 않는다 | Must |
| FR-41 | 파일 크기 상한을 둔다(기본 20MB). 초과 시 413 | Must |
| FR-42 | 파싱하지 않는다. **BFF는 CSV를 읽지 않는다** | Must |
| FR-43 | 서버의 부분 성공 응답(`inserted`·`duplicated`·`failed`·`failures[]`)을 그대로 전달한다 | Must |
| FR-44 | 실패 행 CSV 다운로드는 서버가 만든 것을 전달한다. BFF가 생성하지 않는다 | Must |

## 거래소 키

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `403 SCOPE_NOT_ALLOWED`를 그대로 전달한다. BFF가 200으로 바꾸지 않는다 | Must |
| FR-51 | **응답에 `accessKey`·`secretKey`를 담지 않는다.** `accessKeyMasked`만 | Must |
| FR-52 | 키 등록 요청 본문을 **로깅하지 않는다** | Must |

## Acceptance Criteria

- [ ] 블록 함수 3개가 개별 export된다
- [ ] `Promise.all`이 0건이다
- [ ] 블록 실패 시 그것만 `unavailable`이고 나머지가 정상이다
- [ ] 금액 블록 실패 시 값이 `null`이고 `0`이 아니다
- [ ] 현재가 보정이 **평가액에만** 적용되고 `interventionPnl` 등이 변경되지 않는다
- [ ] `priceAdjustedAt`이 응답에 있다
- [ ] 가격 캐시가 비면 `priceStale: true`이고 스냅샷 값이 쓰인다
- [ ] **BFF 코드에 세율·수수료·환율 상수가 0건이다** (grep)
- [ ] `reconciliation`이 모든 청구서 응답에 있다
- [ ] `degradedReasons` 5종이 그대로 전달된다
- [ ] `interpolatedDays`·`unsupportedTransactions`가 전달된다
- [ ] `topLosses`·`topGains`가 둘 다 있고 `topGains`가 비어도 필드가 있다
- [ ] `hasGains`가 있다
- [ ] `biasBreakdown`에 `none`이 포함된다
- [ ] CSV가 스트리밍 프록시되고 BFF 메모리를 통과하지 않는다 (20MB 파일로 확인)
- [ ] BFF가 CSV를 파싱하지 않는다 (코드 검사)
- [ ] 부분 성공 응답이 그대로 전달된다
- [ ] `403 SCOPE_NOT_ALLOWED`가 그대로 전달된다
- [ ] 응답에 secret·accessKey 평문이 0건이다
- [ ] 키 등록 요청 본문이 로그에 0건이다

## Dependencies

- **선행:** `BFF-REQ-006`(레이어) · `SRV-REQ-013`(서버 계약)
- **짝:** `BFF-REQ-012`(API) · `013`(UPSTREAM) · `014`(PERF)
- **규칙:** `bff-architecture.md`

## Open Questions

- 현재가 보정을 BFF가 할지 서버가 할지. **서버가 하면 BFF가 값을 만지지 않아 더 깨끗하지만**, 서버는 실시간 가격 캐시를 갖고 있지 않다(BFF가 WS를 구독한다). → 현재 구조에서는 BFF가 맞다.
- 스냅샷 미스 시 계산 완료를 프론트에 어떻게 알릴지: 폴링 / 알림 / SSE. **폴링이 가장 단순**하지만 요청이 늘어난다.
