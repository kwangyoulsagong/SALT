---
id: BFF-REQ-017
feature: F002
area: bff
kind: UPSTREAM
title: "F002 세금 마감 콕핏 — 서버 호출 계약 정의"
priority: critical
labels: [bff, upstream, backend-integration, tax]
created: 2026-09-09
---

## Summary

BFF가 부르는 서버 엔드포인트와 그 계약. **BFF는 세금을 계산하지 않는다** — 서버 응답을 화면 모양으로 옮기기만 한다.

## 호출 맵

| BFF 블록 함수 | 서버 호출 | 타임아웃 | 재시도 |
|---|---|---|---|
| `taxDeadlines` | `GET /api/tax/deadlines?taxYear` | 300ms | 1회 |
| `usStockTax` | `GET /api/tax/cockpit?taxYear` (usStock 부분) | 800ms | 1회 |
| `cryptoTax` | 동일 (crypto 부분) | 800ms | 1회 |
| `krStockTax` | 동일 (krStock 부분) | 600ms | 1회 |
| `taxArchive` | `GET /api/tax/archive` | 400ms | 1회 |
| `fxTrap` | `GET /api/tax/fx-trap?taxYear` | 800ms | 1회 |
| `solveHarvest` | `POST /api/tax/harvest-solve` | **2s** | **0회** |
| `cryptoScenario` | `POST /api/tax/crypto-scenario` | 600ms | 1회 |
| `archiveDownload` | `POST /api/tax/archive/download` | 600ms | 0회 |
| `lawConfig` | `GET/PATCH /api/tax/law-config` | 400ms | GET 1회 / PATCH 0회 |
| `manualSnapshot` | `POST /api/tax/snapshot/manual` | 600ms | **0회** |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **한 번의 서버 호출로 자산군 3종을 받는다.** `GET /api/tax/cockpit`이 세 자산군을 함께 주므로 블록 함수 3개가 **같은 호출 결과를 공유**한다 — 세 번 부르지 않는다 | Must |
| FR-2 | 그 공유를 위해 요청 스코프 캐시(같은 요청 안에서 1회)를 둔다. **글로벌 캐시가 아니다** | Must |
| FR-3 | mutation(`harvest-solve`·`archive/download`·`law-config` PATCH·`snapshot/manual`)은 **재시도하지 않는다** | Must |
| FR-4 | 타임아웃은 블록 예산보다 짧다. 초과 시 `unavailable` | Must |
| FR-5 | 서버 에러 코드를 그대로 전달한다: `403 SCOPE_NOT_ALLOWED` · `403 SNAPSHOT_IMMUTABLE` · `409` · `422` | Must |
| FR-6 | 서버가 `degraded: true`를 주면 그대로 전달한다. **BFF가 판단하지 않는다** | Must |
| FR-7 | 인증 토큰을 그대로 전달한다. BFF가 해석하지 않는다 | Must |

## 계약 의존 — 서버가 바뀌면 여기가 깨진다

| 서버 필드 | BFF 뷰모델 필드 | 변경 시 영향 |
|---|---|---|
| `deadlines[].lastTradeDate` · `recommendedDate` | 동일 | 화면 D-Day 칩 |
| `usStock.taxableBase` · `estimatedTax` | 동일 | 미국주식 카드 |
| `crypto.holdings[].costBasis.{movingAverage,fifo}` | 동일 | 취득가액 2방식 병기 |
| `crypto.holdings[].scenarioParams` | 동일 | **슬라이더 클라이언트 재계산.** 누락되면 슬라이더가 죽는다 |
| `crypto.holdings[].breakEvenYearEndPrice` | 동일 | 손익분기 콜아웃 |
| `krStock.capitalGainTaxable` | 동일 | 비과세 문구 렌더 조건 |
| `lawConfigShown` | 동일 | **계산 전제 노출.** 없으면 정책 위반 |
| `disclaimer` | 동일 | 동일 |
| `candidates[].isOptimal` | 동일 | 근사 표시 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 위 필드가 서버 응답에 없으면 **BFF가 기본값을 만들지 않는다.** `unavailable`로 처리하고 `degradedBlocks`에 넣는다 | Must |
| FR-11 | 서버 계약 변경 시 `salt-server/**` 영향 확인이 필요하다. **계약 테스트(스냅샷)를 둔다** | Must |
| FR-12 | `lawConfigShown`이 비어 있으면 **세금 화면을 렌더하지 않는다.** 계산 전제 노출은 정책이다 | Must |

## Acceptance Criteria

- [ ] 자산군 3블록이 서버를 **1회만** 부른다 (요청 로그로 확인)
- [ ] 요청 스코프 캐시가 요청 간에 공유되지 않는다
- [ ] mutation 4종이 재시도되지 않는다
- [ ] 타임아웃 초과 시 `unavailable`이다
- [ ] 서버 에러 코드 4종이 그대로 전달된다
- [ ] 서버 `degraded`가 그대로 전달된다
- [ ] `scenarioParams` 누락 시 기본값을 만들지 않고 `unavailable`이다
- [ ] `lawConfigShown`이 비면 세금 화면을 렌더하지 않는다
- [ ] 계약 스냅샷 테스트가 있다
- [ ] 토큰이 그대로 전달되고 BFF가 해석하지 않는다

## Dependencies

- **선행:** `SRV-REQ-017`(서버 계약)
- **짝:** `BFF-REQ-015` · `016` · `018`
- **규칙:** `backend-integration.md`

## Open Questions

- 서버 `GET /api/tax/cockpit`이 세 자산군을 함께 주므로 **블록별 지연 분리의 이득이 줄어든다.** 서버가 자산군별 엔드포인트를 따로 주는 것이 더 나은가 → `SRV-REQ-017`과 함께 재검토. 다만 세 자산군이 같은 원장을 읽으므로 **한 번에 주는 것이 서버 쪽에서 더 싸다.**
- 계약 스냅샷 테스트를 BFF에 둘지 서버에 둘지. 양쪽에 두면 중복이고 한쪽만이면 놓친다.
