---
id: SRV-REQ-019
feature: F002
area: srv
kind: PERF
title: "F002 세금 마감 콕핏 — 서버 성능 정의"
priority: high
labels: [performance, budget, solver, snapshot]
created: 2026-09-09
---

## Summary

콕핏은 **소스가 여럿이고 하나(솔버)가 느리다.** D-Day는 즉시, 자산군 카드는 조회, 솔버는 500ms다. 이 구조를 예산으로 고정한다.

## 예산

| 작업 | 예산 | 초과 시 |
|---|---|---|
| `GET /api/tax/deadlines` | **100ms** | `TaxLawConfig` 3행 + 캘린더 구간뿐이다 |
| `GET /api/tax/cockpit` | **600ms** | 자산군 카드를 병렬 조회 |
| `POST /api/tax/harvest-solve` | **500ms** | 종목 50개 기준 |
| `POST /api/tax/crypto-scenario` | 200ms | 파라미터 계산 |
| `GET /api/tax/fx-trap` | 300ms | 보유 종목 × 환율 |
| `GET /api/tax/cost-basis/:t/:s` | 100ms | 집계값만 |
| `GET /api/tax/archive` | 100ms | |
| `POST /api/tax/archive/download` | 200ms | 서명 URL 발급 |
| `POST /api/tax/cost-basis/recompute` | 202 즉시 · **백그라운드 3s** | |
| `year-end-snapshot` 수집 | 심볼당 2s · **총 30s** | 6회 재시도 여유 |

## 구조 1 — D-Day를 콕핏에서 분리한다

D-Day는 `TaxLawConfig` + 캘린더 값만으로 계산된다. **자산군 카드(원장 집계)를 기다릴 이유가 없다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `GET /api/tax/deadlines`를 별도 엔드포인트로 둔다. **100ms 예산** | Must |
| FR-2 | 콕핏 응답에도 `deadlines`를 포함하되, 화면은 먼저 온 것을 먼저 렌더한다 | Must |
| FR-3 | D-Day 계산에 **원장을 읽지 않는다** | Must |

## 구조 2 — 자산군 카드 병렬 조회

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 미국주식·크립토·국내주식 집계를 **병렬**로 조회한다. `await`를 연달아 쓰지 않는다 | Must |
| FR-11 | 자산군 하나가 실패하면 **그 자산군만 `null` + `degraded`** 이고 나머지는 응답한다 | Must |
| FR-12 | 환율 결측 종목만 분리하고 나머지는 계산한다. **전체를 실패시키지 않는다** | Must |

## 구조 3 — 솔버는 CPU 바운드다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 솔버는 **순수 함수**이고 계산 중 DB를 부르지 않는다. 입력을 한 번에 받는다 | Must |
| FR-21 | 입력을 DB에서 미리 좁힌다: **평가손실 종목만**, 마감일 지난 종목 제외 | Must |
| FR-22 | 종목 50개에서 부분집합 탐색은 2^50이다. **탐욕 + 부분 매도 조정**으로 근사하고 `isOptimal: false`를 표시한다 | Must |
| FR-23 | 후보 3개를 각각 계산하되 **공통 전처리(정렬·누적합)를 재사용**한다 | Must |
| FR-24 | 종목 수 상한을 둔다(기본 200). 초과 시 손실 큰 순으로 자르고 그 사실을 표시한다 | Should |
| FR-25 | 솔버 실행 시간과 후보 수를 측정한다 | Must |

## 구조 4 — 클라이언트 재계산으로 슬라이더를 넘긴다

연말 시가 슬라이더가 −40%~+80%를 실시간으로 훑는다. **서버 왕복으로는 60fps가 안 된다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `crypto-scenario` 응답에 **`scenarioParams`(세율·공제·취득가액·수량·반올림)** 를 담는다 | Must |
| FR-31 | 클라이언트가 그 값으로만 계산한다. **하드코딩 상수 0건** | Must |
| FR-32 | 슬라이더를 놓으면 서버 계산과 대조한다. 불일치 시 서버 값으로 덮는다 | Must |
| FR-33 | 대조 요청이 프레임을 막지 않게 비동기로 띄운다 | Must |

## 구조 5 — lot 재계산은 비동기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 원장 import 후 **비동기 전량 재계산**. 요청을 붙잡지 않는다 | Must |
| FR-41 | 재계산 중 콕핏이 **마지막 lot 기반으로 응답**하고 `cost_basis_recomputing`을 표시한다 | Must |
| FR-42 | 심볼별로 나누고 배치 insert. advisory lock으로 중복 방지 | Must |
| FR-43 | 재계산 시간을 측정한다. **3s를 넘으면** method를 하나만 저장하고 다른 하나는 요청 시 계산하는 방식을 검토한다 | Must |

## 구조 6 — 트랜잭션과 워커

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 환율 조회·시가 수집·증빙 업로드를 **트랜잭션 밖**에서 한다 | Must |
| FR-51 | `prisma.$transaction`은 `application`에서만 | Must |
| FR-52 | **`year-end-snapshot.worker`를 LLM·반사실 워커와 다른 큐에** 넣는다. 00:10 실행이 밀리면 안 된다 | Must |
| FR-53 | `tax-deadline-notify.worker`는 DB만 훑는다. LLM 큐에 넣지 않는다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정 항목: **스냅샷 수집 성공/실패**, **솔버 실행 시간·후보 수**, **환율 결측률**, **D-Day 알림 발송 수**, lot 재계산 시간, 콕핏 블록별 지연 | Must |
| FR-61 | **세금 금액을 로그에 남기지 않는다.** 지연·건수만 | Must |
| FR-62 | 환율 결측률이 올라가면 계산 정확도가 떨어진다. **알림 임계값을 둔다** | Should |
| FR-63 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] `GET /api/tax/deadlines` p95 < 100ms (측정값 기록)
- [ ] D-Day 계산에서 원장 쿼리가 0건이다
- [ ] `GET /api/tax/cockpit` p95 < 600ms (측정값 기록)
- [ ] 자산군 조회가 병렬이다 (`await` 연쇄 0건)
- [ ] 자산군 하나를 강제 실패시키면 그것만 `null`이고 나머지가 응답한다
- [ ] 환율 결측 종목만 분리되고 나머지가 계산된다
- [ ] **솔버 실행 < 500ms (종목 50개, 측정값 기록)**
- [ ] 솔버 계산 중 DB 호출이 0건이다
- [ ] 솔버 입력이 평가손실 종목만이고 마감일 지난 종목이 제외된다
- [ ] 근사 시 `isOptimal: false`가 표시된다
- [ ] 종목 상한 초과 시 자르고 그 사실이 표시된다
- [ ] `scenarioParams`가 응답에 있고 클라이언트에 하드코딩 상수가 0건이다
- [ ] **클라이언트 재계산 결과가 서버와 원 단위까지 일치한다** (경계값 10케이스)
- [ ] 슬라이더가 60fps를 유지한다
- [ ] lot 재계산이 비동기이고 재계산 중 `cost_basis_recomputing`이 표시된다
- [ ] lot 재계산 시간이 측정되어 있다
- [ ] 트랜잭션 안 외부 호출이 0건이다
- [ ] 스냅샷 워커가 별도 큐에 있다
- [ ] 관측 항목 6종이 있고 로그에 세금 금액이 0건이다

## Dependencies

- **선행:** `SRV-REQ-016`~`018` · `DB-REQ-012`(DB 성능)
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- 보유 종목이 실제로 50개나 되는가. 사용자 ≤10명이면 **10~20개일 가능성이 높고, 그러면 솔버를 완전 탐색으로 최적해를 낼 수 있다** — `isOptimal: true`가 가능해진다. 실측 후 재검토.
- lot 재계산 3s 달성 여부(`DB-REQ-012`와 동일).
- 클라이언트 재계산 일치 검증 범위(`SRV-REQ-017` Open Question과 동일).
