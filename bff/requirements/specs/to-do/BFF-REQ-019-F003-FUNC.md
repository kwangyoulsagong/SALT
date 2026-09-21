---
id: BFF-REQ-019
feature: F003
area: bff
kind: FUNC
title: "F003 밸류에이션 밴드 적립 — BFF 조립 로직 정의"
priority: high
labels: [bff, viewmodel, render-gate, kimchi]
created: 2026-09-09
---

## Summary

주간 계획 뷰모델 조립. **김프를 별도로 부르고 실패를 격리**하는 것과 **실패 이력 게이트를 그대로 전달**하는 것이 핵심이다.

## 블록 분해

| 블록 | 소스 | 예산 | 실패 시 |
|---|---|---|---|
| `weeklyPlan` | `GET /api/plan/weekly` | 250ms | `unavailable` |
| `kimchiPremium` | `GET /api/plan/kimchi-premium` | 실시간 | **`null` — 적립 숫자는 유지** |
| `streak` | 위 응답에 포함 | — | — |
| `monthlySummary` (2026-09-21 — B20) | `GET /api/plan/monthly-summary` | 300ms | `unavailable` — 목표 카드는 그대로 |
| `planSettings` (2026-09-21 — D9) | `GET /api/plan/settings` | 100ms | `unavailable` |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 두 소스를 **병렬**로 부른다. `Promise.allSettled` | Must |
| FR-2 | **김프 실패가 적립 숫자를 막지 않는다.** `kimchiPremium: null`이고 `items`는 정상 | Must |
| FR-3 | 계획 조회 실패는 `status: 'unavailable'` | Must |
| FR-4 | mutation(`complete`·`settings` PATCH)은 **재시도하지 않는다** | Must |
| FR-5 | 타임아웃: 계획 500ms, 김프 1.5s(외부 3곳) | Must |

## 게이트는 전달만 한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `renderable`·`blockedReason`·`trackRecordId`를 **그대로 전달**한다 | Must |
| FR-11 | **BFF가 게이트를 판정하지 않는다.** `trackRecordId`가 null인지 보고 `renderable`을 만들지 않는다 | Must |
| FR-12 | **게이트를 우회하지 않는다.** `renderable: false`를 `true`로 바꾸는 코드가 0건 | Must |
| FR-13 | `renderable: false`가 **200**이다 | Must |
| FR-14 | 게이트 미충족 카운터를 남긴다(관측성) | Should |

## 계산하지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **배수를 계산하지 않는다.** 서버 값 | Must |
| FR-21 | **금액을 계산하지 않는다.** `amountKrw`는 서버가 1,000원 단위로 반올림한 값 | Must |
| FR-22 | **김프 비용(`costKrwOnPlan`)을 계산하지 않는다.** 서버 값 | Must |
| FR-23 | 연속 주차·누적액을 계산하지 않는다 | Must |
| FR-24 | **BFF에 임계값·배수 상수가 0건**이다 | Must |

## 문구를 만들지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `band.code`·`reasonCode`·`noteCode`·`degradedReasons`를 **코드로** 전달한다 | Must |
| FR-31 | **완성 문장을 만들지 않는다.** 프론트 `shared/i18n`이 담당 | Must |
| FR-32 | `narrative`(LLM 문장)가 있으면 그대로 전달하고 없으면 `null` | Must |
| FR-33 | **비난 문구·지시형 문구를 만들지 않는다** | Must |

## 지표 상태 전달

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `indicator.fallback`·`staleDays`·`asOf`를 그대로 전달한다. 화면이 `지표 3일 지연` 배지를 만든다 | Must |
| FR-41 | `secondaryIndicators`(Puell)를 전달하되 **배수에 영향하지 않음**을 계약으로 유지한다 | Must |
| FR-42 | `excluded[]`(국내주식)를 전달한다 | Must |

## 실행 기록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `POST /complete`는 mutation. **재시도 0회**(서버가 멱등이지만 중복 요청을 만들지 않는다) | Must |
| FR-51 | 성공 시 주간 계획 쿼리를 **무효화**한다 | Must |
| FR-52 | **낙관적 갱신을 허용한다.** 적립 완료 체크는 금액 계산이 아니다 → 다만 **응답의 `streakWeeks`·`cumulativeKrw`는 서버 값으로 덮는다** | Must |
| FR-53 | **2026-09-21 추가 — ADR-002 · B20.** 실행 기록은 수동 체크뿐이다. BFF가 거래(`/api/portfolio/transactions`)를 보고 적립 완료를 추정·전달하는 경로가 0건이다 | Must |
| FR-54 | **2026-09-21 추가 — B20.** `POST /complete` 성공 시 이번 달 적립 합계 쿼리도 무효화한다. 목표 화면 합계가 늦게 따라오면 체크가 안 된 것처럼 보인다 | Must |

## 설정 · 온보딩 — 2026-09-21 추가 (D9 · B12)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `PATCH /settings`는 `{ monthlyBaseKrw }`만 **그대로 전달**한다. 주간 환산·배분을 BFF가 계산하지 않는다 | Must |
| FR-61 | 서버 422(`PLAN_BASE_AMOUNT_INVALID`·`PLAN_BAND_READ_ONLY`)를 **코드와 `field`·`min`·`max`를 보존해** 전달한다. 폼이 필드 에러를 그릴 근거다 | Must |
| FR-62 | 밴드 키를 BFF가 걸러 내 조용히 성공시키지 않는다. 서버가 422를 내게 둔다 | Must |
| FR-63 | 설정 뷰모델의 `band.editable: false`·`readOnlyReason`을 그대로 전달한다 | Must |
| FR-64 | 온보딩 3단계 저장도 **같은 `PATCH /settings`** 다. 성공 시 주간 계획·홈 블록 쿼리를 무효화한다 | Must |

## 이번 달 적립 합계 — 2026-09-21 추가 (B20)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `executedKrw`·`plannedKrw`·`progressPct`·`daysLeft`를 **계산하지 않고 전달**한다(공통 기준 ③) | Must |
| FR-71 | 합계 실패가 목표 목록을 막지 않는다. 목표 화면은 블록별로 격리한다 | Must |

## Acceptance Criteria

- [ ] 계획과 김프가 병렬로 호출된다
- [ ] **김프 실패 시 `kimchiPremium: null`이고 `items` 금액이 유효하다**
- [ ] 계획 실패 시 `unavailable`이다
- [ ] mutation 재시도가 0건이다
- [ ] `renderable`·`blockedReason`·`trackRecordId`가 그대로 전달된다
- [ ] **BFF가 게이트를 판정하는 코드가 0건이다**
- [ ] `renderable: false`를 `true`로 바꾸는 코드가 0건이다
- [ ] `renderable: false`가 200이다
- [ ] **BFF에 배수·금액·김프 비용·연속 주차 계산 코드가 0건이다**
- [ ] **BFF에 임계값·배수 상수가 0건이다** (grep)
- [ ] 문구 필드가 전부 코드이고 완성 문장이 0건이다
- [ ] `narrative`가 그대로 전달되거나 `null`이다
- [ ] `fallback`·`staleDays`·`asOf`가 전달된다
- [ ] `secondaryIndicators`가 전달되고 배수에 영향하지 않는다
- [ ] `excluded[]`가 전달된다
- [ ] `POST /complete` 성공 시 계획 쿼리가 무효화된다
- [ ] 낙관적 갱신 후 `streakWeeks`가 서버 값으로 덮인다
- [ ] **거래 데이터로 적립 완료를 추정하는 코드가 0건이다** (ADR-002 · B20)
- [ ] `PATCH /settings`가 `monthlyBaseKrw`만 전달하고 환산 코드가 0건이다 (D9)
- [ ] 422 코드·`field`·`min`·`max`가 보존된다
- [ ] 이번 달 합계 필드가 서버 값 그대로다 (B20)
- [ ] `complete`·`settings` 성공 시 월 합계·주간 계획 쿼리가 무효화된다

## Dependencies

- **선행:** `BFF-REQ-006`(레이어) · `SRV-REQ-021`(서버 계약)
- **짝:** `BFF-REQ-020`(API) · `021`(UPSTREAM) · `022`(PERF)
- **규칙:** `bff-architecture.md`

## Open Questions

- 김프를 계획 응답에 합칠지 프론트가 두 번 부를지. **BFF가 병렬로 합쳐 주는 것**이 프론트에 편하다 → 그렇게 한다.
- 적립 완료 낙관적 갱신이 "금액 화면 낙관적 갱신 금지" 원칙과 충돌하지 않는가. **체크 상태는 금액이 아니므로** 허용이 맞다(F003 UX 상태에도 그렇게 적혀 있다).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. FR-53·54(수동 체크만 · 월 합계 무효화 — ADR-002 · B20), FR-60~64(설정 · 온보딩 저장 — D9 · B12), FR-70·71(이번 달 적립 합계 — B20) 추가 |
