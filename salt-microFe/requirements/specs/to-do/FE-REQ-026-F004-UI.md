---
id: FE-REQ-026
feature: F004
area: fe
kind: UI
title: "F004 AI 코치 추천 — 웹 UI 정의 (3종 세트 카드 · 게이트 렌더 차단 · 성적표)"
priority: critical
labels: [fe, ui, fsd, coach, render-gate, a11y]
created: 2026-09-09
---

## Summary

**서버에 엔진이 다 있는데 화면이 없어서 0원인 기능**을 화면으로 만든다. 이 REQ의 핵심은 **3종 세트가 없으면 카드를 렌더하지 않는 것**이고, 그것을 컴포넌트 레벨에서 강제한다.

## FSD 배치

| 레이어 | 슬라이스 | 컴포넌트 |
|---|---|---|
| `pages` | `coach` | `CoachPage` |
| `widgets` | `coach-console` | 추천 카드 + 리스크 + 후보 + 익절 + preflight + 성적표 + 행동기록 |
| `features` | `rate-recommendation` | 피드백 (도움 됐음/안 됨 + 사유) |
| `features` | `run-preflight` | 주문 전 계산 (**게이트 없음**) |
| `features` | `regenerate-coach` | 재생성 (쿨다운) |
| `features` | `edit-coach-profile` | 성향 설정 |
| `entities` | `coach` | **`RecommendationCard`**(게이트 포함) · `ReasonList` · `SignalTrackRecordBadge` · `FailureCaseAccordion` · `RiskList` · `CandidateList` · `ExitPlanCard` · `SignalScoreboard` · `BehaviorFactRow` · `ScoreNote` · `BlockedNotice` · `DisclaimerBanner` |
| `entities` | `indicator` | `IndicatorFailureList` |

## 화면 구조

```
/coach
┌─ 생성 시각 + staleHours 배지 ("생성 후 27시간 경과" + [새로 생성])
├─ [Suspense] 추천 카드 ────────────────────────────────────┐
│   ┌ renderable: true ─────────────────────────────────┐  │
│   │ 매수 · KRW-BTC · 점수 72 / 100                     │  │
│   │ "점수는 확률이 아닙니다"                            │  │
│   │                                                    │  │
│   │ 왜: MVRV Z −0.3 · RSI 28(과매도) · 비중 34%(상한 60% 이내) │
│   │     시장 레짐 accumulation                          │  │
│   │                                                    │  │
│   │ 이 유형 신호 성적: 최근 42회 · 승률 57%             │  │
│   │     평균 +3.1% · 최대낙폭 −11%                      │  │
│   │                                                    │  │
│   │ 틀렸던 때: 2025-10 사이클 톱에서 이 지표군은        │  │
│   │     매도 신호를 내지 못했습니다 (이후 −52%)          │  │
│   │                                                    │  │
│   │ [근거 자세히] [도움 됐음] [도움 안 됨]              │  │
│   └────────────────────────────────────────────────────┘  │
│   ┌ renderable: false ────────────────────────────────┐   │
│   │ (회색 박스) 이 신호의 과거 성적 데이터가 아직 없어  │   │
│   │ 추천을 표시하지 않습니다 (표본 3건)                │   │
│   │ 이것은 정상 동작입니다.                             │   │
│   └────────────────────────────────────────────────────┘  │
├─ [Suspense] 리스크 (severity 내림차순)
├─ [Suspense] 후보 목록 (상위 3, 접힌 근거)
├─ [Suspense] 익절 플랜 (보유 종목별 3단계 + 현재가 대비 거리 %)
├─ 주문 전 계산 (금액 입력 → 비중·최대손실·손익비. **게이트 없음**)
├─ [Suspense] 신호 성적표 (표: 유형·표본·승률·평균·MDD, 표본<20 배지)
├─ [Suspense] 행동 기록 (사실 서술 + 청구서 링크)
├─ 국내주식 제외 안내
└─ 면책 배너 (고정)
```

## Requirements

### A. 3종 세트 게이트 — 컴포넌트 레벨 강제

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`RecommendationCard`가 `renderable: false`면 카드 대신 `BlockedNotice`를 렌더한다.** 부모가 판단하지 않고 카드 자신이 한다 | Must |
| FR-2 | `BlockedNotice`에 **`blockedReason`별 문구**를 표시하고 **"이것은 정상 동작입니다"** 를 명시한다 | Must |
| FR-3 | `signal_track_record_missing`이면 표본 수를 함께 보여준다 | Must |
| FR-4 | **카드 안에 근거·적중률·실패사례 3개가 동시에 보인다.** 하나를 접거나 탭으로 나누지 않는다 | Must |
| FR-5 | **우회 prop을 만들지 않는다.** `forceRender`·`skipGate` 같은 것이 0건이다 | Must |
| FR-6 | 홈 요약 카드에도 **같은 게이트**가 적용된다. 홈에서만 렌더되고 상세에서 차단되면 안 된다 | Must |
| FR-7 | `[근거 자세히]`를 펼치면 `topFactors`(점수 기여도)가 나온다 | Must |

### B. 점수 표시

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 점수를 `0~100`으로 표시하고 **`scoreNote`("점수는 확률이 아닙니다")를 함께** 렌더한다 | Must |
| FR-11 | `scoreNote`가 없으면 **점수를 표시하지 않는다** | Must |
| FR-12 | `action` 4종을 **색 + 텍스트 + 아이콘 3중**으로 구분한다 | Must |
| FR-13 | 점수에 `aria-label`("100점 중 72점") | Must |
| FR-14 | **점수를 확률·확신으로 읽히게 하는 시각 표현을 쓰지 않는다.** 게이지·프로그레스바로 100% 채우는 식은 금지 | Must |

### C. 성적표

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 카드 안 배지: `최근 N회 · 승률 X% · 평균 +Y% · 최대낙폭 −Z%` | Must |
| FR-21 | **`lowSample: true`(표본 < 20)면 `표본 부족` 배지 + 승률 회색 처리** | Must |
| FR-22 | 별도 섹션에 **신호 유형별 표**를 둔다. 실제 `<table>` + `<caption>` | Must |
| FR-23 | `status: insufficient_data`면 "성적 데이터가 아직 없습니다" | Must |
| FR-24 | **코치가 자기 성적을 공개하는 것이 신뢰의 근거다.** 성적이 나빠도 숨기지 않는다 | Must |

### D. 실패사례

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 카드 안에 실패사례 **1건을 요약**으로, 아코디언에 전체를 | Must |
| FR-31 | 실패사례에 날짜·사건·결과가 있다 | Must |
| FR-32 | `failureCases`가 비면 **카드가 렌더되지 않는다**(게이트) | Must |
| FR-33 | 아코디언은 `<details>` | Must |

### E. 익절 플랜

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 보유 종목별 3단계: 손실 제한 · 1차 익절 · 추세 유지 조건 | Must |
| FR-41 | **현재가 대비 거리 %** 를 표시한다(`distancePct`) | Must |
| FR-42 | 실제 `<table>` 또는 `<dl>`로 렌더한다 | Must |
| FR-43 | **목표주가·수익률 예측 문구가 0건**이다. "내 규칙 기반 가격"임을 명시 | Must |
| FR-44 | 보유 0건이면 "보유 종목이 없습니다" | Must |
| FR-45 | `trendHold.conditionCode`를 문구로 매핑한다 | Must |

### F. 주문 전 계산

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 금액 입력 → 진입 후 비중 · 상한 초과 여부 · 최대 손실 · 손익비 · 잔여 현금 | Must |
| FR-51 | **게이트·차단 동작이 없다.** 입력하면 항상 결과를 보여준다 | Must |
| FR-52 | 상한 초과여도 **경고만** 하고 막지 않는다 | Must |
| FR-53 | **"주문하기" 버튼을 만들지 않는다.** "업비트에서 직접 주문하세요"로 끝낸다 | Must |
| FR-54 | 금액 입력은 `TextField big` 또는 `Keypad`. 큰 숫자를 다룬다 | Should |

### G. 행동 기록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `factCode` + `params`를 **사실 서술 문장**으로 렌더한다 | Must |
| FR-61 | **인격 평가 문구가 0건**이다. "당신은 패닉셀러입니다" ❌ / "최근 30일 매도 3건 후 90일 내 가격이 회복되었습니다. 합계 −890,000원" ⭕ | Must |
| FR-62 | 청구서 링크를 제공한다(F001로 이동) | Must |
| FR-63 | 거래 수 < 3이면 "거래 기록이 부족합니다" | Must |

### H. 피드백과 재생성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `[도움 됐음]` / `[도움 안 됨]`. 안 됨을 누르면 **사유 4종**(근거 부족 / 이미 알고 있음 / 틀린 것 같음 / 실행 불가) | Must |
| FR-71 | 이미 남긴 피드백을 표시한다(`feedback` 필드) | Must |
| FR-72 | **피드백만 낙관적 갱신을 허용**한다 | Must |
| FR-73 | `staleHours > 24`면 `생성 후 N시간 경과` 배지 + `[새로 생성]` | Must |
| FR-74 | 쿨다운 중이면 버튼 비활성 + **남은 시간 표시** | Must |
| FR-75 | 재생성 중 `Button loading`. **흐려지지 않는다** | Must |
| FR-76 | 429를 받으면 남은 시간을 표시한다. 오류로 표시하지 않는다 | Must |

### I. 성향 설정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | `riskTolerance` · `maxSingleAssetWeight` · `rebalanceBand` · `panicSellWindowHours` · `defaultMode` · `notificationLevel` | Must |
| FR-81 | `defaultMode`·`notificationLevel`이 **영속화되므로 UI에 노출**한다(`unsupportedPersistedFields` 제거 후) | Must |
| FR-82 | 저장 후 추천을 재조회한다. 성향이 점수에 영향한다 | Must |

### J. 면책과 제외

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | **면책 배너를 상시 노출**한다. `disclaimer`가 없으면 화면을 렌더하지 않는다 | Must |
| FR-91 | `excluded[]`에 따라 "국내주식은 추천 대상이 아닙니다" | Must |
| FR-92 | LLM 실패 시 `explanation.source: 'rule'`이면 **`규칙 기반 설명` 배지** | Must |
| FR-93 | AI 생성물을 **`colors.ai.*` + `Badge tone="ai"`** 로 표시하고 생성 시각을 붙인다 | Must |

## UX 상태

- **Loading**: 카드 스켈레톤. 최신 insight가 있으면 먼저 렌더 + 생성 시각
- **Empty (insight 없음)**: "아직 추천이 없습니다. 거래내역을 연결하면 코치가 판단할 수 있습니다." + [생성] / 온보딩 링크
- **Empty (보유 0건)**: 익절 카드 대신 "보유 종목이 없습니다"
- **Blocked (게이트)**: FR-1~3
- **Stale**: FR-73
- **Cooldown**: FR-74
- **Degraded (LLM 실패)**: FR-92
- **Error**: 마지막 성공 insight + 재시도
- **Optimistic update**: **피드백만**

## 접근성

| ID | 요구사항 |
|---|---|
| FR-100 | `action`을 색 + 텍스트 + 아이콘 3중 표기 |
| FR-101 | 점수에 `aria-label` |
| FR-102 | 익절 3단계를 `<table>` 또는 `<dl>` |
| FR-103 | 접힌 근거는 `<details>` |
| FR-104 | 성적표는 실제 `<table>` + `<caption>` |
| FR-105 | 손익 부호를 색 + `+`/`−` 문자 |
| FR-106 | 늦게 오는 블록에 `aria-busy` |

## Acceptance Criteria

- [ ] `/coach`에서 추천 카드가 action·symbol·score와 함께 렌더된다
- [ ] **`signalTrackRecord`를 null로 만들면 카드가 렌더되지 않고 사유가 표시된다**
- [ ] **`failureCases`를 빈 배열로 만들면 카드가 렌더되지 않는다**
- [ ] `reasons`가 비면 카드가 렌더되지 않는다
- [ ] `BlockedNotice`에 "이것은 정상 동작입니다"가 있다
- [ ] **카드에 근거·적중률·실패사례가 동시에 보인다**
- [ ] **우회 prop이 0건이다** (`forceRender`·`skipGate` grep)
- [ ] 홈 요약 카드에도 같은 게이트가 적용된다
- [ ] `[근거 자세히]`가 `topFactors`를 펼친다
- [ ] **"점수는 확률이 아닙니다"가 보인다**
- [ ] `scoreNote`가 없으면 점수가 표시되지 않는다
- [ ] `action` 4종이 색 + 텍스트 + 아이콘으로 구분된다
- [ ] 점수를 100% 채우는 게이지 표현이 0건이다
- [ ] **표본 < 20에서 `표본 부족` 배지 + 승률 회색 처리**
- [ ] 성적표가 실제 `<table>` + `<caption>`이다
- [ ] 실패사례가 카드 안 요약 + 아코디언 전체다
- [ ] 익절 3단계와 `distancePct`가 표시된다
- [ ] **목표주가·수익률 예측 문구가 0건이다**
- [ ] **주문 전 계산에 게이트·차단 동작이 0건이다**
- [ ] **"주문하기" 버튼이 0건이다**
- [ ] 행동 기록이 사실 서술이고 **인격 평가 문구가 0건이다**
- [ ] 청구서 링크가 동작한다
- [ ] 피드백 사유 4종이 있고 이미 남긴 피드백이 표시된다
- [ ] 피드백만 낙관적 갱신이다
- [ ] `staleHours > 24`에서 배지 + [새로 생성]이 나온다
- [ ] 쿨다운 중 버튼이 비활성이고 남은 시간이 표시된다
- [ ] 429가 오류가 아니라 남은 시간으로 표시된다
- [ ] 재생성 중 버튼이 `loading`이고 흐려지지 않는다
- [ ] 성향 설정 6항목이 있고 저장 후 추천이 재조회된다
- [ ] **면책 배너가 상시 노출되고 `disclaimer` 없으면 화면이 렌더되지 않는다**
- [ ] `excluded[]`에 따라 국내주식 제외가 표시된다
- [ ] LLM 실패 시 `규칙 기반 설명` 배지가 나온다
- [ ] AI 생성물이 `colors.ai.*` + `Badge tone="ai"` + 생성 시각으로 구분된다
- [ ] **확신 표현("확실"·"무조건"·"보장"·"100%")이 0건이다**
- [ ] 375px에서 body 가로 스크롤이 0이다

## Dependencies

- **선행:** `FE-REQ-008`(Suspense) · `FE-REQ-009`(FSD) · `BFF-REQ-024`
- **짝:** `FE-REQ-027`(FUNC) · `028`(API) · `029`(PERF)
- **연동:** `FE-REQ-030`(F006 코치 대화)가 이 카드를 대화 안에서 재사용한다
- **규칙:** `a11y-policy.md` · `i18n-policy.md` · `design-system.md`

## Open Questions

- 카드에 3종을 다 넣으면 **카드가 길어진다.** 모바일에서는 더 심하다 → 실패사례를 1줄 요약 + 아코디언으로 하는 것이 기본안이지만, "동시에 보인다"는 정책과의 경계를 확인해야 한다.
- 점수를 어떻게 시각화할지. **게이지·프로그레스바가 확률로 읽힌다**는 우려가 있어 숫자만 쓰는 것이 기본안.
- `run-preflight`에 금액 입력을 `Keypad`로 할지 `TextField`로 할지. PC면 `TextField`가 맞다.
