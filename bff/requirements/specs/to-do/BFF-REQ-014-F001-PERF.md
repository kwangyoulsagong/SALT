---
id: BFF-REQ-014
feature: F001
area: bff
kind: PERF
title: "F001 개입 청구서 — BFF 성능 정의"
priority: critical
labels: [bff, performance, budget, streaming, cache]
created: 2026-09-09
---

## Summary

청구서의 부하는 **큰 응답(`series`)** 과 **큰 업로드(CSV)** 다. 둘 다 BFF 메모리를 통과하지 않게 하는 것이 이 REQ의 핵심이다.

## 예산

| 엔드포인트 | 예산 | 내역 |
|---|---|---|
| `GET /api/app/invoice` (스냅샷 히트) | **350ms** | 서버 300ms + 보정 20ms + BFF 20ms |
| `GET /api/app/invoice` (스냅샷 미스) | **350ms** | 서버가 즉시 `degraded` 반환 |
| `GET /api/app/invoice/trades` | 250ms | |
| `GET /api/app/ledger/health` | 350ms | |
| `POST /api/app/ledger/import` (10,000행) | **12s** | 서버 10s + 스트리밍 오버헤드 |
| `POST /api/app/ledger/keys` | 3.5s | 거래소 스코프 조회 |
| `POST /api/app/invoice/recompute` | 200ms | 202 즉시 |
| **BFF가 얹는 지연** | **20ms 이하** | 보정 포함 |

## 급소 1 — `series` 응답 크기

기간 `all`이면 일별 배열이 수천 개다. 트랙 3개 × 날짜 = 필드가 곱해진다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 서버가 **다운샘플링한 것을 그대로** 전달한다. BFF가 다시 자르지 않는다(두 곳에서 자르면 해상도가 예측 불가) | Must |
| FR-2 | 서버 `series` 길이 상한을 확인하고 기록한다. **상한이 없으면 서버에 요청**한다 | Must |
| FR-3 | 응답 크기를 측정한다. **1MB를 넘으면** 서버 다운샘플링 상한을 낮춘다 | Must |
| FR-4 | gzip 압축을 켠다(SSE 제외) | Must |

## 급소 2 — CSV 업로드

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **스트리밍 프록시.** 파일이 BFF 메모리를 통과하지 않는다 | Must |
| FR-11 | 20MB 파일 업로드 중 **BFF 메모리 증가분을 측정**하고 기록한다. 파일 크기에 비례하면 스트리밍이 안 되고 있다 | Must |
| FR-12 | 상한 초과 시 스트림을 끊는다. 전부 받은 뒤 거부하지 않는다 | Must |
| FR-13 | 동시 업로드 수를 제한한다(기본 2). 사용자 ≤10명이지만 20MB × N이면 메모리가 문제가 된다 | Should |

## 급소 3 — 현재가 보정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 보정은 **인메모리 캐시 읽기**다. 20ms 이내 | Must |
| FR-21 | 캐시에 없는 심볼로 **서버를 다시 부르지 않는다.** 예산을 넘긴다 | Must |
| FR-22 | 보정 로직이 O(보유 종목 수)다. 정렬·중첩 루프를 넣지 않는다 | Must |

## 병렬화와 타임아웃

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `invoiceSummary`와 `ledgerHealth`를 **병렬**로 부른다 | Must |
| FR-31 | `Promise.allSettled` 사용. `Promise.all` 금지 | Must |
| FR-32 | 서버 호출마다 타임아웃. 블록 예산보다 짧게 | Must |
| FR-33 | 집계 총 타임아웃 = 가장 느린 블록 + 100ms | Must |
| FR-34 | mutation 재시도 0회 | Must |

## 캐시

| 대상 | 정책 |
|---|---|
| 청구서 응답 | **캐시하지 않는다.** 스냅샷이 이미 서버 캐시다 |
| 원장 건강도 | 캐시하지 않는다 |
| 현재가 | 기존 인메모리 캐시(worker 갱신) |
| `narrative` | 서버가 스냅샷에 저장한다. BFF 캐시 0건 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 청구서·원장건강도를 BFF에서 캐시하지 않는다. **서버 스냅샷이 이미 캐시 계층**이다 | Must |
| FR-41 | 두 곳에 캐시를 두면 무효화가 두 배로 어려워진다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 측정: 엔드포인트별 p95, **`series` 응답 크기 분포**, **업로드 시 메모리 증가분**, 보정 시각(`priceStale` 발생률), `degradedBlocks` 발생률, 서버 호출 지연 | Must |
| FR-51 | **BFF가 얹는 지연**을 별도 측정한다 | Must |
| FR-52 | 업로드 요청 본문과 금액을 로그에 남기지 않는다 | Must |
| FR-53 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] `GET /api/app/invoice` p95 < 350ms (스냅샷 히트, 측정값 기록)
- [ ] 스냅샷 미스에서도 350ms 이내다
- [ ] `series`를 BFF가 재가공하지 않는다 (길이가 서버 값과 동일)
- [ ] `series` 응답 크기가 측정되고 1MB 이하다
- [ ] gzip이 켜져 있다 (SSE 제외)
- [ ] **20MB 업로드 중 BFF 메모리 증가분이 파일 크기에 비례하지 않는다** (측정값 기록)
- [ ] 20MB 초과 시 스트림이 끊기고 413이다
- [ ] 동시 업로드가 제한된다
- [ ] 현재가 보정이 20ms 이내다
- [ ] 캐시에 없는 심볼로 서버를 다시 부르지 않는다
- [ ] `invoiceSummary`와 `ledgerHealth`가 병렬이다
- [ ] `Promise.all`이 0건이다
- [ ] 서버 호출 전부에 타임아웃이 있다
- [ ] mutation 재시도가 0건이다
- [ ] 청구서·원장건강도가 BFF에서 캐시되지 않는다
- [ ] **BFF가 얹는 지연 < 20ms** (측정값 기록)
- [ ] 관측 항목 6종이 있다
- [ ] 로그에 업로드 본문·금액이 0건이다

## Dependencies

- **선행:** `BFF-REQ-011`~`013` · `SRV-REQ-015`(서버 성능)
- **규칙:** `performance-bff.md`

## Open Questions

- `series` 다운샘플링 상한을 서버가 정하는가. 정하지 않으면 기간 `all`에서 응답이 커진다 — **서버에 상한 요청이 필요**하다(`SRV-REQ-013` Open Question).
- 업로드 진행률을 프론트에 알릴 방법. 스트리밍 프록시에서는 서버 진행을 모른다 → **알리지 않고 스피너만** 보여주는 것이 기본안.
