---
id: FE-REQ-023
feature: F003
area: fe
kind: FUNC
title: "F003 밸류에이션 밴드 적립 — 웹 기능 정의 (렌더 게이트 · 계산 금지 · 상태)"
priority: high
labels: [fe, func, fsd, plan, render-gate]
created: 2026-09-09
---

## Summary

프론트는 **적립액을 계산하지 않는다.** 밴드 판정도, 배수 적용도, 반올림도 서버다. 프론트가 하는 일은 **게이트 판정 결과를 그대로 집행**하고, 사용자의 편집/체크를 서버로 보내는 것뿐이다.

## 슬라이스 구성

```
entities/plan/
  model/         WeeklyPlan 타입 · 게이트 셀렉터 · 밴드 표 파생
  ui/            WeeklyPlanCard · BandGauge · BandTable · AccumulationStreak
  api/           BFF 어댑터
entities/indicator/
  model/         staleness 판정 · 실패 이력 정규화
  ui/            IndicatorTrackRecord · IndicatorStaleBadge
entities/fx/
  model/         김프 level 매핑
  ui/            KimchiPremiumGauge
features/complete-weekly-plan/  체크 · 낙관적 갱신 · 롤백
features/edit-plan-settings/    월 적립액 1필드 폼 · 형식 검증 · 저장 (설정 화면·온보딩 공용 — 2026-09-21 D9 · B12)
entities/plan/ui/MonthlyAccumulationSummary   이번 달 적립 합계 (목표 화면 상단 — 2026-09-21 B20)
widgets/home-briefing/          ② 블록 조립
pages/assets/                   적립 상세
```

## Requirements

### A. 계산 금지 (핵심)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **프론트에 밴드 임계값 상수가 0건**이다. `Z < 0`, `40.6`, `3.0` 같은 리터럴이 소스에 없다 | Must |
| FR-2 | **배수 곱셈이 0건**이다. `base * multiplier` 계산을 프론트가 하지 않는다 | Must |
| FR-3 | **금액 반올림이 0건**이다. 서버가 준 1,000원 단위 정수를 그대로 렌더한다 | Must |
| FR-4 | 밴드 표는 서버가 준 `bandConfig[]`를 렌더한다. 하드코딩 표가 0건이다 | Must |
| FR-5 | 김프 `level`은 서버 판정을 쓴다. 프론트가 `%`로 재판정하지 않는다 | Must |
| FR-6 | 위 규칙을 **lint 룰 + 테스트**로 강제한다 | Must |

**왜**: 밴드 임계값이 두 곳에 있으면 반드시 갈라진다. 서버가 3.0배로 계산한 375,000원을 프론트가 2.5배 표로 설명하는 순간, 이 제품의 유일한 자산인 신뢰가 끝난다.

### B. 렌더 게이트 집행

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `selectMultiplierRenderable(plan, assetId)` 셀렉터 **하나**만 게이트를 판정한다 | Must |
| FR-11 | 판정 입력은 BFF의 `renderable` · `blockedReason` · `trackRecordId`뿐이다 | Must |
| FR-12 | 셀렉터가 `false`면 배수·근거·밴드 강조를 **트리 자체에서 제외**한다. CSS `display:none`이 아니다 | Must |
| FR-13 | 게이트가 `false`여도 **`baseAmount`는 렌더**한다 | Must |
| FR-14 | 홈 위젯과 상세 페이지가 **같은 셀렉터**를 쓴다 | Must |
| FR-15 | `renderable` 필드가 응답에 없으면 **`false`로 취급**한다 (fail-closed) | Must |
| FR-16 | 게이트 차단 시 `plan_multiplier_blocked` 이벤트를 남긴다 | Should |

### C. 데이터 로딩

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 홈 ② 블록은 **RSC + Suspense**로 스트리밍된다. 셸을 막지 않는다 | Must |
| FR-21 | 적립 상세는 BFF `GET /bff/plan/weekly` 1회로 조립된다 | Must |
| FR-22 | **BFF 외 upstream 직접 호출이 0건**이다 | Must |
| FR-23 | 실패 이력은 **아코디언 펼침 시 lazy fetch**한다 | Should |
| FR-24 | `kimchiPremium: null`이 정상 응답이다. 에러 처리하지 않는다 | Must |
| FR-25 | 지표 전체 실패(`indicators: []`)에서도 화면이 렌더된다 | Must |

### D. 적립 완료

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 체크는 `POST /bff/plan/weekly/{planId}/complete` | Must |
| FR-31 | **낙관적 갱신**을 하고 실패 시 롤백 + 토스트 | Must |
| FR-32 | `Idempotency-Key`에 `planId + weekOf`를 넣는다. 더블 탭이 두 번 기록되지 않는다 | Must |
| FR-33 | ~~원장 sync 자동 매칭 결과가 오면 체크 상태를 서버 값으로 덮어쓴다~~ → **개정 2026-09-21** — 원장 자동 매칭이 없다(ADR-002 · 기본안 — 감사 문서 B20). 체크 상태의 출처는 **사용자 수동 체크뿐**이다. 서버 응답(`status`)은 여전히 낙관적 값을 덮어쓴다 | Must |
| FR-34 | 체크 성공 시 연속 주차·누적액과 **이번 달 적립 합계**를 재검증(revalidate)한다(2026-09-21 — B20) | Must |
| FR-35 | **2026-09-21 추가 — B20.** 체크 시 자산별 실제 금액을 고칠 수 있다(기본값 = 계획액). 보내는 값은 사용자가 입력한 정수 그대로다 — 프론트가 반올림·합산하지 않는다 | Should |

### E. 설정 편집

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **월 적립액 1필드 폼.** 저장은 `PATCH /api/app/plan/settings` `{ monthlyBaseKrw }`. 배수·임계값 필드가 폼·요청 타입에 0개다. **개정 2026-09-21** — D9: 밴드는 읽기 전용(과거 적중률이 기본 밴드 기준) | Must |
| FR-41 | 클라이언트 검증은 **형식만**(숫자·정수). 하한·상한·1,000원 단위는 **서버 422**로 받는다 — 숫자를 프론트에 두면 서버와 갈린다 | Must |
| FR-42 | 서버 `422 PLAN_BASE_AMOUNT_INVALID`의 `field`·`min`·`max`·`unitKrw`를 폼 필드 오류에 매핑한다. `422 PLAN_BAND_READ_ONLY`는 버그 신호다(폼이 보낼 수 없다) — 로그만 | Must |
| FR-43 | 저장 성공 후 **현재 주 계획은 갱신하지 않는다**. "다음 계획부터" 안내. 예외: 첫 저장(`configured: false → true`)은 주간 계획·홈 블록을 revalidate 한다(B12) | Must |
| FR-44 | 온보딩 3단계는 **같은 `features/edit-plan-settings`** 를 쓴다(기본안 — 감사 문서 B12). 주간 환산은 **서버가** 하고, 화면의 "주간 N원" 은 저장 응답 `assets[].weeklyBaseKrw` 합이다. 프론트 `× 12 ÷ 52`·`÷ 4` 계산 0건 | Must |
| FR-45 | **2026-09-21 추가 — D9.** 밴드 표는 설정 응답 `band.rows`로 **읽기 전용** 렌더한다. `editable: false`가 아니면(계약 위반) 그래도 입력 칸을 만들지 않는다 | Must |

### G. 이번 달 적립 합계 — 2026-09-21 추가 (B20)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `GET /api/app/plan/monthly-summary` 1회로 블록을 조립한다. RSC + Suspense, 목표 카드와 **별도 경계** | Must |
| FR-61 | 합계·진행률·남은 일수 계산 코드가 0건이다(공통 기준 ③) | Must |
| FR-62 | `status: 'unavailable'`이면 블록만 오류, 목표 카드는 렌더 | Must |

### F. 금지 동작

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **주문 실행 경로가 0건**이다. 거래소 주문/출금 API를 부르는 코드가 없다 | Must |
| FR-51 | **김프 차익거래 안내 로직이 0건**이다 | Must |
| FR-52 | **`Z >= 7`에서 매도 문구를 만드는 분기가 0건**이다. 0x는 "신규 적립 없음"으로만 매핑된다 | Must |
| FR-53 | 미실행 주차에 대한 **점수·등급·벌점 계산이 0건**이다 | Must |
| FR-54 | 적립 완료 외 **낙관적 갱신이 0건**이다 | Must |

## 상태 머신 (주간 계획)

```
loading -> ready
ready --(renderable=false)--> gated      : 기본액만 + 사유
ready --(indicators=[])-----> degraded   : 기본액만 + "밴드 조정 없음"
ready --(multiplier=0)------> zeroWeek   : "신규 적립 없음" (매도 아님)
ready --(체크)--------------> completing -> completed
completing --(실패)---------> ready + 토스트
*    --(BFF 5xx)------------> error (재시도 버튼)
```

## 테스트

| 종류 | 대상 |
|---|---|
| 단위 | `selectMultiplierRenderable` — `renderable` 누락 → `false` |
| 단위 | 김프 `level` 매핑을 프론트가 재계산하지 않음 |
| 컴포넌트 | `renderable:false` → 배수 노드 부재(`queryBy...` null), 기본액 존재 |
| 컴포넌트 | `multiplier:0` → "매도" 문자열 부재 |
| 컴포넌트 | `kimchiPremium:null` → 적립 총액 존재 |
| 통합 | 더블 탭 → complete 요청 1회 |
| 정적 | 소스 전체에 밴드 임계값 리터럴 0건 |
| 정적 | 주문/출금 API 문자열 0건 |

## Acceptance Criteria

- [ ] **프론트에 밴드 임계값 상수가 0건이다**
- [ ] **배수 곱셈·금액 반올림 코드가 0건이다**
- [ ] 밴드 표가 서버 `bandConfig[]`로 렌더된다
- [ ] 김프 `level`을 프론트가 재판정하지 않는다
- [ ] 위 금지가 lint + 테스트로 강제된다
- [ ] **게이트 판정 셀렉터가 하나뿐이고 홈/상세가 공유한다**
- [ ] **`renderable` 누락 시 `false`로 취급된다**
- [ ] 게이트 차단 시 배수 노드가 DOM에 없다
- [ ] 게이트 차단 시에도 기본액이 렌더된다
- [ ] 홈 ② 블록이 Suspense로 스트리밍되고 셸을 막지 않는다
- [ ] **BFF 외 직접 호출이 0건이다**
- [ ] `kimchiPremium: null`이 에러로 처리되지 않는다
- [ ] `indicators: []`에서도 화면이 렌더된다
- [ ] 적립 체크가 낙관적 갱신 + 롤백된다
- [ ] **더블 탭에서 complete가 1회만 전송된다**
- [ ] **원장·거래 기반 자동 매칭 코드가 0건이다** (ADR-002 · B20)
- [ ] 설정 저장 후 현재 주 계획이 바뀌지 않는다
- [ ] 서버 422 필드 오류가 폼에 매핑된다
- [ ] 온보딩이 월 적립액 1필드고 환산이 서버에서 일어난다 (B12)
- [ ] **설정 폼·요청 타입에 배수·임계값 필드가 0개다** (D9)
- [ ] 하한·상한 숫자가 프론트 소스에 0건이고 422 `min`·`max`로 표시된다
- [ ] 첫 저장 후 홈 적립 블록이 revalidate 된다
- [ ] 이번 달 합계가 별도 Suspense 경계이고 계산 코드가 0건이다 (B20)
- [ ] 체크 성공 시 이번 달 합계가 revalidate 된다
- [ ] **주문/출금 호출 경로가 0건이다**
- [ ] **김프 차익거래 안내 로직이 0건이다**
- [ ] **`multiplier: 0`에서 매도 문구 분기가 0건이다**
- [ ] 점수·등급 계산이 0건이다
- [ ] 적립 완료 외 낙관적 갱신이 0건이다

## Dependencies

- **선행:** `FE-REQ-022`(UI) · `BFF-REQ-020`(계약)
- **짝:** `FE-REQ-024`(API) · `025`(PERF)
- **규칙:** `fsd-entities.md` · `fsd-features.md` · `streaming-ssr.md`

## Open Questions

- `bandConfig`를 서버에서 받으면 "밴드 표 즉시 렌더"가 불가능하다. **정적 셸에 밴드 축만 그리고 현재 위치만 스트리밍**하는 절충이 필요하다.
- FR-30(`POST /bff/plan/weekly/{planId}/complete`)·`FE-REQ-024` 경로가 BFF 계약(`POST /api/app/plan/weekly/complete`, body 에 `weekOf`)과 다르다. 2026-09-21 이전부터 있던 드리프트 — 구현 착수 전 `BFF-REQ-020` 기준으로 맞춘다.
- 실패 이력 lazy fetch는 게이트 검증(`trackRecordId` 존재)과 별개다. `trackRecordId`가 있는데 fetch가 실패하면 이미 렌더된 배수를 되돌릴지.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. FR-33(수동 체크만 — ADR-002 · B20), FR-40~44(월 적립액 1필드 · `PATCH /api/app/plan/settings` · 온보딩 공용 — D9 · B12) 개정. FR-35·45, G절 FR-60~62(이번 달 적립 합계) 추가 |
