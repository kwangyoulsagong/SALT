---
id: BFF-REQ-015
feature: F002
area: bff
kind: FUNC
title: "F002 세금 마감 콕핏 — BFF 조립 로직 정의"
priority: critical
labels: [bff, viewmodel, aggregation, allsettled, tax]
created: 2026-09-09
---

## Summary

세금 콕핏 뷰모델을 조립한다. **소스가 여럿이고 하나(솔버)가 느리다** — D-Day는 즉시, 자산군 카드는 조회, 솔버는 사용자 요청 시. 이 지연 차이를 블록으로 나누는 것이 이 REQ의 핵심이다.

## 블록 분해

| 블록 | 소스 | 예산 | 웹 | 모바일 |
|---|---|---|---|---|
| `deadlines` | `GET /api/tax/deadlines` | 100ms | 별도 엔드포인트 (Suspense 밖) | 집계에 포함 |
| `usStock` | `GET /api/tax/cockpit` | 300ms | 블록 엔드포인트 | 집계 |
| `crypto` | 동일 | 300ms | 블록 엔드포인트 | 집계 |
| `krStock` | 동일 | 200ms | 블록 엔드포인트 | 집계 |
| `archive` | `GET /api/tax/archive` | 100ms | 블록 엔드포인트 | 집계 |
| `harvest` | `POST /api/tax/harvest-solve` | 500ms | **사용자 요청 시** | 동일 |
| `fxTrap` | `GET /api/tax/fx-trap` | 300ms | 블록 엔드포인트 | 집계 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 블록 함수를 개별 export한다: `taxDeadlines` · `usStockTax` · `cryptoTax` · `krStockTax` · `taxArchive` · `fxTrap` | Must |
| FR-2 | 집계 엔드포인트는 그 함수들을 **`Promise.allSettled`** 로 묶은 얇은 껍데기다. `Promise.all` 금지 | Must |
| FR-3 | **솔버는 집계에 포함하지 않는다.** 사용자가 요청할 때만 부른다. 500ms를 콕핏 첫 페인트에 얹지 않는다 | Must |
| FR-4 | 블록 실패 시 그 블록만 `status: 'unavailable'`. `degradedBlocks[]`에 이름을 넣는다 | Must |
| FR-5 | **금액 블록 실패 시 `0`을 내려보내지 않는다.** `null` + `unavailable`이다 | Must |
| FR-6 | 서버가 준 `degraded` · `degradedReasons` · `unsupported`를 **지우지 않고 전달**한다 | Must |
| FR-7 | 서버 호출마다 **타임아웃**을 준다. 블록 예산보다 짧게 | Must |
| FR-8 | 재시도는 조회에만 최대 1회. `harvest-solve`·`snapshot/manual`은 재시도하지 않는다 | Must |

## BFF가 하는 것과 하지 않는 것

| 한다 | 하지 않는다 |
|---|---|
| 블록 조립 · 부분 실패 격리 | **세금 계산** (세율·공제·과세표준·솔버) |
| 서버 코드 → 화면 필드명 변환 | **세율·공제·시행일 하드코딩** |
| `daysRemaining` 재계산 (서버 값이 오래됐을 때) | 취득가액·환율 환산 |
| `lawConfigShown` 전달 | 법령 상태 판정 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **BFF에 세율·공제·시행일 상수가 0건**이다. 전부 서버 `lawConfigShown`에서 온다 | Must |
| FR-11 | `daysRemaining`만 예외로 BFF가 재계산할 수 있다 — 날짜가 바뀌면 서버 캐시값이 하루 틀린다. **날짜 계산만이고 금액이 아니다** | Should |
| FR-12 | 서버가 코드로 준 `noteCode`·`caveatCodes`·`degradedReasons`를 **문구로 바꾸지 않는다.** 프론트 `shared/i18n`이 담당 | Must |
| FR-13 | `disclaimer`를 항상 전달한다 | Must |

## 슬라이더 파라미터 전달

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `crypto-scenario` 응답의 **`scenarioParams`를 그대로 전달**한다. BFF가 변형하지 않는다 | Must |
| FR-21 | 클라이언트 재계산 결과가 서버 계산과 일치해야 하므로 **`roundingMode`를 포함해 누락 없이** 넘긴다 | Must |

## Acceptance Criteria

- [ ] 블록 함수 6개가 개별 export된다
- [ ] `grep -rn "Promise.all(" bff/src/services/app-tax*` = 0
- [ ] 솔버가 집계 엔드포인트에 포함되지 않는다
- [ ] 블록 하나를 강제 실패시키면 그것만 `unavailable`이고 나머지가 정상이다
- [ ] 금액 블록 실패 시 값이 `null`이고 `0`이 아니다
- [ ] 서버의 `degraded`·`degradedReasons`·`unsupported`가 응답에 그대로 있다
- [ ] 서버 호출 전부에 타임아웃이 있다
- [ ] `harvest-solve`가 재시도되지 않는다
- [ ] **BFF 코드에 세율·공제·시행일 리터럴이 0건이다** (grep)
- [ ] 서버가 준 코드가 문구로 변환되지 않는다
- [ ] `disclaimer`가 항상 있다
- [ ] `scenarioParams`가 `roundingMode` 포함해 그대로 전달된다

## Dependencies

- **선행:** `BFF-REQ-006`(레이어 정리) · `SRV-REQ-017`(서버 계약)
- **짝:** `BFF-REQ-016`(API) · `017`(UPSTREAM) · `018`(PERF)
- **규칙:** `bff-architecture.md`

## Open Questions

- `daysRemaining` 재계산(FR-11)을 BFF가 할지 클라이언트가 할지. **클라이언트가 하는 것이 더 정확**하다(사용자 시간대). 그러면 BFF는 날짜만 전달한다 — 그쪽이 기본안일 수 있다.
- 솔버 결과를 캐시할지. 보유가 안 바뀌면 같은 결과다. 다만 **연말에는 보유가 자주 바뀐다** → 캐시하지 않는 것이 기본안.
