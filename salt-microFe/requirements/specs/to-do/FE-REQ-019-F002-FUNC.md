---
id: FE-REQ-019
feature: F002
area: fe
kind: FUNC
title: "F002 세금 마감 콕핏 — 웹 기능 규칙 정의 (클라이언트 재계산 · D-Day · 문구 게이트)"
priority: critical
labels: [fe, func, fsd, client-calc, i18n-gate]
created: 2026-09-09
---

## Summary

세금 화면에서 클라이언트가 **계산해도 되는 것**과 **절대 계산하면 안 되는 것**을 가른다. 그리고 문구 정책(압박 금지·지시형 금지·재매수 권유 금지)을 **렌더 게이트**로 강제한다.

## 클라이언트가 계산하는 것 — 딱 둘

전 영역 공통 수용 기준: *"금액 계산은 서버에서 한다. 프론트는 표시만."* 예외가 둘 있고 각각 근거가 있다.

| 계산 | 근거 | 제약 |
|---|---|---|
| **`daysRemaining`** | 서버 값은 캐시라 하루 틀린다. 사용자 시간대가 맞다 | 날짜 계산이고 **금액이 아니다** |
| **연말 시가 슬라이더 3열 재계산** | −40%~+80%를 실시간으로 훑는다. 서버 왕복으로 60fps가 안 된다 | 서버가 준 `scenarioParams`로만. **하드코딩 상수 0건** |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `daysRemaining`을 `lastTradeDate`·`recommendedDate`와 오늘 날짜(KST)로 계산한다 | Must |
| FR-2 | D-Day 계산은 `entities/tax/lib/calcDaysRemaining.ts`에 둔다. **날짜 경계는 KST 기준**이다 | Must |
| FR-3 | 슬라이더 재계산은 `features/simulate-crypto-scenario/lib/recalcScenario.ts`에 둔다 | Must |
| FR-4 | 재계산은 **`scenarioParams`의 값만** 쓴다. 세율·공제·반올림을 코드에 박지 않는다 | Must |
| FR-5 | 반올림은 `scenarioParams.roundingMode`를 따른다. 서버와 **원 단위까지 일치**해야 한다 | Must |
| FR-6 | 슬라이더를 놓으면(`onChangeCommitted`) 서버 계산과 대조하고 **불일치 시 서버 값으로 덮는다** | Must |
| FR-7 | 대조 요청이 프레임을 막지 않게 비동기로 띄운다 | Must |
| FR-8 | 그 외 어떤 금액도 클라이언트에서 계산하지 않는다. **과세표준·세액·취득가액·솔버·환율 환산 전부 서버** | Must |

## 문구 게이트 — 정책을 코드로 강제한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 사용자 노출 문구는 전부 `shared/i18n`에 있다. 컴포넌트에 하드코딩 0건 | Must |
| FR-11 | **금지 표현 린트 규칙**을 둔다: "확실" · "무조건" · "보장" · "100%" · "서둘러" · "지금 매도" · "이렇게 하세요" · "절세 전략" · "추천" | Must |
| FR-12 | 서버가 준 `noteCode`·`caveatCodes`·`assumptionCodes`·`degradedReasons`를 **i18n 키로 매핑**한다. 서버 문장을 그대로 렌더하지 않는다 | Must |
| FR-13 | **매핑되지 않은 코드가 오면 그 항목을 렌더하지 않고** 개발 로그에 남긴다. 알 수 없는 코드를 원문으로 노출하지 않는다 | Must |
| FR-14 | `caveatCodes`에 **재매수 취득가액 경고가 없으면 솔버 후보를 렌더하지 않는다.** 렌더 게이트 | Must |
| FR-15 | `disclaimer`가 없으면 **세금 화면을 렌더하지 않는다.** 면책은 정책이다 | Must |
| FR-16 | `lawConfigShown`이 비어 있으면 **세금 화면을 렌더하지 않는다.** 계산 전제 노출은 정책이다 | Must |

## 상태 관리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 서버 데이터는 **서버 컴포넌트가 조회**한다. React Query는 mutation과 슬라이더 대조에만 | Must |
| FR-21 | 슬라이더 값은 `features/simulate-crypto-scenario/model`의 로컬 상태다. 전역에 두지 않는다 | Must |
| FR-22 | 솔버 결과는 mutation 결과다. **캐시하지 않는다** — 연말에는 보유가 자주 바뀐다 | Must |
| FR-23 | 법령 파라미터 편집은 mutation → 성공 시 **화면 전체 재조회** | Must |
| FR-24 | **낙관적 갱신 0건.** 금액 화면이다 | Must |
| FR-25 | 선택된 `taxYear`는 URL 쿼리(`?taxYear=2026`)다. 새로고침·공유에서 유지된다 | Must |
| FR-26 | 선택된 취득가액 방식(`selectedMethod`)은 설정값이고 서버에 저장된다 | Must |

## 부분 실패 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 블록 `status: 'unavailable'`이면 그 블록만 에러 상태 + 재시도 버튼 | Must |
| FR-31 | **금액이 `null`이면 `0`으로 표시하지 않는다.** "불러올 수 없습니다" | Must |
| FR-32 | `degradedReasons`별로 다른 경고 문구를 매핑한다: `fx_missing` · `ledger_mismatch` · `calendar_missing` · `cost_basis_recomputing` · `snapshot_missing` · `lot_mismatch` | Must |
| FR-33 | `cost_basis_recomputing`이면 마지막 값을 보여주고 **"다시 계산하고 있습니다"** 를 표시한다 | Must |
| FR-34 | 환율 결측 종목은 목록에서 제외하지 않고 **`환율 없음` 배지 + 계산 제외** 로 표시한다. 숨기면 사용자가 누락을 모른다 | Must |

## 진입과 zone 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 세금 zone 진입은 `<a>`다. `shared/config`의 zone 경로 목록을 참조한다 | Must |
| FR-41 | zone 경로에 `<Link>`를 쓰면 **ESLint가 실패**한다 | Must |
| FR-42 | 진입 링크에 로딩 상태를 준다(hard navigation) | Must |

## Acceptance Criteria

- [ ] `daysRemaining`이 클라이언트에서 KST 기준으로 계산된다
- [ ] 슬라이더 재계산이 `scenarioParams`만 쓴다 (**하드코딩 세율·공제 0건**, grep)
- [ ] **슬라이더 재계산 결과가 서버 계산과 원 단위까지 일치한다** (경계값 10케이스)
- [ ] 슬라이더를 놓으면 서버 대조가 일어나고 불일치 시 서버 값으로 덮인다
- [ ] 대조 요청이 프레임을 막지 않는다 (60fps 유지)
- [ ] 그 외 금액 계산 코드가 프론트에 0건이다 (과세표준·세액·취득가액·솔버·환율)
- [ ] 사용자 문구가 전부 `shared/i18n`에 있다
- [ ] **금지 표현 린트 규칙이 동작한다** (위반 문구 삽입 시 lint 실패)
- [ ] 서버 코드가 i18n 키로 매핑된다
- [ ] 매핑되지 않은 코드가 원문으로 노출되지 않는다
- [ ] **`caveatCodes`에 재매수 경고가 없으면 솔버 후보가 렌더되지 않는다**
- [ ] **`disclaimer`가 없으면 화면이 렌더되지 않는다**
- [ ] **`lawConfigShown`이 비면 화면이 렌더되지 않는다**
- [ ] React Query가 조회에 쓰이지 않는다 (서버 컴포넌트가 조회)
- [ ] 솔버 결과가 캐시되지 않는다
- [ ] 낙관적 갱신이 0건이다
- [ ] `taxYear`가 URL 쿼리로 유지된다
- [ ] 금액 `null`이 `0`으로 표시되지 않는다
- [ ] `degradedReasons` 6종이 각각 다른 문구로 매핑된다
- [ ] `cost_basis_recomputing`에서 마지막 값 + 안내가 표시된다
- [ ] 환율 결측 종목이 숨겨지지 않고 배지로 표시된다
- [ ] zone 경로에 `<Link>`가 0건이고 lint가 그것을 막는다

## Dependencies

- **선행:** `FE-REQ-018`(UI) · `FE-REQ-009`(FSD) · `BFF-REQ-016`
- **규칙:** `i18n-policy.md` · `fsd-features.md` · `state-convention.md`

## Open Questions

- 금지 표현 린트를 **어떤 도구로** 구현할지. 커스텀 ESLint 규칙 또는 i18n 카탈로그 검사 스크립트. 후자가 더 정확하다(문구가 한 곳에 있으므로).
- 슬라이더 대조의 허용 오차. **0원(완전 일치)** 이 기본안이지만 부동소수점 때문에 클라이언트에서 `Decimal` 라이브러리가 필요할 수 있다 → 번들 크기 영향 측정 필요.
- `taxYear`를 URL에 두면 zone 경계를 넘을 때 유지된다. 홈에서 세금으로 갈 때 연도를 넘길지.
