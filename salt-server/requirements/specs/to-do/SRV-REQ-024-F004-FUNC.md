---
id: SRV-REQ-024
feature: F004
area: srv
kind: FUNC
title: "F004 AI 코치 추천 — 도메인 로직 정의 (3종 세트 게이트 · 성적표 · 익절 플랜 · 범위 제한)"
priority: critical
labels: [ddd, domain, coach, render-gate, llm, signal-performance]
created: 2026-09-09
---

## Summary

**서버에는 이미 엔진이 다 있다.** `ai-coach`(점수 엔진 468줄 + Gemini explainer) · `signal-performance` · `profit-plan` · `trade-preflight` · `behavior-coach`. F004의 도메인 작업은 **그것들을 `coach` 컨텍스트로 통합하고, 3종 세트 렌더 게이트를 도메인 정책으로 만들고, 추천 범위 제한을 코드로 강제하는 것**이다.

## 컨텍스트 통합

기존 5개 모듈이 하나의 컨텍스트가 된다.

| 기존 | 이관 후 |
|---|---|
| `investment-insight/ai-coach/*` (점수 엔진 · feature extractor · candidate generator · explainer · gemini explainer) | `coach/domain/policy/score` · `coach/infrastructure/GeminiExplainerClient` |
| `signal-performance/*` | `coach/domain/policy/signalPerformance` + `coach/infrastructure/SignalPerformanceProjection` |
| `profit-plan/*` | `coach/domain/policy/exitPlan` |
| `trade-preflight/*` | `coach/domain/policy/preflight` |
| `behavior-coach/*` + `investment-insight/behavior-analysis` | `coach/domain/policy/behaviorFact` + **거래 단위 라벨러**(F001이 소비) |
| `investment-insight/{market-regime,portfolio-state,news-analysis,whale-signal,risk-alert,portfolio-rebalance}` | `market`(regime·news·whale) / `coach`(risk·rebalance) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `coach` 컨텍스트를 만들고 위 5개를 통합한다. **점수 엔진 로직을 바꾸지 않는다** — 이관만 한다 | Must |
| FR-2 | 점수 엔진·explainer는 **변경 금지 목록**이다(글로벌 플랜 6절). 리팩터링 편의로 계산을 바꾸지 않는다 | Must |
| FR-3 | `investment-insight/`의 12개 서비스를 `coach`·`market`·`indicator`로 나눈다. 배치는 `SRV-REQ-006` Open Question | Must |
| FR-4 | 이관 전/후 **응답이 바이트 단위로 같아야 한다**(스냅샷 테스트) | Must |

## 3종 세트 렌더 게이트 — 이 REQ의 핵심

글로벌 플랜 1-3절: **추천 카드에는 예외 없이 근거·과거 적중률·실패사례가 붙는다. 하나라도 없으면 렌더하지 않는다.**

```
policy/renderGate.ts

renderable = hasReasons && hasSignalTrackRecord && hasFailureCases
blockedReason = 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing'
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 게이트를 **`coach/domain/policy/renderGate.ts`의 순수 함수**로 만든다. 서비스에 `if`로 흩뿌리지 않는다 | Must |
| FR-11 | **근거**: `reasons[]`가 비어 있지 않고 `topCandidateFactors[]`가 있다 | Must |
| FR-12 | **적중률**: `signalTrackRecord`가 `null`이 아니다. `signalType` → 성적표 조회가 성공해야 한다 | Must |
| FR-13 | **실패사례**: `failureCases[]`가 비어 있지 않다. `IndicatorTrackRecord.missesJson`에서 온다 | Must |
| FR-14 | 게이트 차단은 **에러가 아니다.** `renderable: false` + `blockedReason`을 응답에 담는다 | Must |
| FR-15 | **우회 플래그를 만들지 않는다.** 관리자 모드·디버그 플래그로도 뚫리지 않는다 | Must |
| FR-16 | 게이트가 홈 요약(`/preview`)에도 적용된다. 홈에서만 렌더되고 상세에서 차단되는 일이 없어야 한다 | Must |
| FR-17 | 게이트 차단 사유별 카운터를 남긴다(관측성). **초기에 대부분 차단될 수 있고 그것을 알아야 한다** | Must |

## 추천 범위 제한 — 법적 포지셔닝

글로벌 플랜 1-3절: **개별 미국 주식 신규 매수 추천 금지.** 지수/ETF 단위 또는 보유 종목 관리(비중·손절·세금)만.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `policy/recommendationScope.ts`가 생성 단계에서 거부한다: **`assetType == us_stock` && `action == buy` && 미보유 && 개별 종목** | Must |
| FR-21 | **지수/ETF 판정 데이터가 필요하다.** `MarketAsset` 분류 컬럼 또는 화이트리스트. 없으면 **보수적으로 전부 거부**한다 | Must |
| FR-22 | `kr_stock`은 **추천 대상에서 제외**한다(실시간 데이터·지표 부재). 보유 표시와 비중 경고만 | Must |
| FR-23 | 제외 사실을 응답 `excluded[]`에 담는다. 화면이 "국내주식은 추천 대상이 아닙니다"를 표시한다 | Must |
| FR-24 | 거부된 후보를 로그에 남긴다. **범위 제한이 실제로 작동하는지** 확인해야 한다 | Must |

## 성적표 (`policy/signalPerformance`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 신호 유형별로 그룹화한다: `sample` · `winRate` · `avgReturn` · `maxDrawdown` | Must |
| FR-31 | **`sample < 20`이면 `lowSample: true`** 다. 화면이 `표본 부족` 배지를 붙이고 승률을 회색 처리한다 | Must |
| FR-32 | `lowSample`에서 **게이트를 차단할지는 정책 결정**이다. 초기에는 표본이 거의 없어 모든 카드가 미렌더될 수 있다 → **기본안: 표본 1건 이상이면 통과하고 `lowSample`로 표시** | Must |
| FR-33 | `coach_feedback` kind를 성과 샘플에서 **제외**한다(기존 동작 유지) | Must |
| FR-34 | 샘플은 최대 20개만 응답에 담는다(기존 계약) | Must |
| FR-35 | 데이터 부족이면 `status: insufficient_data`(기존 계약 유지) | Must |
| FR-36 | **N+1을 제거한다.** 심볼별 가격을 한 번에 받아 계산한다(`DB-REQ-020` FR-10~15) | Must |

## 익절 플랜 (`policy/exitPlan`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 보유 종목별 3단계: **손실 제한 · 1차 익절 · 추세 유지 조건** | Must |
| FR-41 | **`distanceFromCurrentPct`를 추가**한다(현재가 대비 거리 %). 화면이 계산하지 않게 | Must |
| FR-42 | 가격은 **내 규칙 기반**이다. **목표주가·수익률 예측을 만들지 않는다**(1-3절) | Must |
| FR-43 | 기존 계산식(`profitRate > 10 ? currentPrice * 0.94 : averageBuyPrice * 0.92` 등)을 **바꾸지 않는다.** 이관만 한다 | Must |
| FR-44 | 계산을 `Money`·`Decimal`로 올린다. 현재 `Float` 산술이다 | Must |
| FR-45 | `assetType`을 `crypto`에서 3자산군으로 확장한다. 현재 `where: { assetType: 'crypto' }`로 하드코딩되어 있다 | Must |

## 주문 전 계산 (`policy/preflight`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 진입 후 비중 · 상한 초과 여부 · 최대 손실 · 손익비 · 잔여 현금을 계산한다 | Must |
| FR-51 | **게이트·차단 동작이 없다.** 계산 표시 전용이다. `blocked`·`allowed` 같은 필드를 만들지 않는다 | Must |
| FR-52 | **주문을 실행하지 않는다.** 이 정책에 주문 관련 Port가 없다 | Must |
| FR-53 | 기존 계산을 바꾸지 않는다. 이관만 한다 | Must |

## 행동 기록 (`policy/behaviorFact`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 편향 판정을 **사실 서술 문장의 근거**로 변환한다. 서버는 **코드 + 수치**만 주고 문구는 프론트가 만든다 | Must |
| FR-61 | **인격 평가 문구를 서버가 만들지 않는다.** "당신은 패닉셀러입니다" 같은 문장을 생성하지 않는다 | Must |
| FR-62 | 기존 `behavior-coach` 응답 계약을 **유지**한다(하위 호환). `factCode` + `params`를 **추가**한다 | Must |
| FR-63 | **거래 단위 라벨러를 `application/api`로 공개**한다. F001의 `invoice`가 ACL로 소비한다 | Must |
| FR-64 | 기존 판정이 집계 기반이면 거래 단위로 분해되지 않을 수 있다. **그 경우 라벨러를 새로 쓰고 기존 응답은 그대로 둔다** | Must |
| FR-65 | 거래 수 < 3이면 `insufficient_data`(기존 동작 유지) | Must |

## LLM 해설

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 기존 `ai-coach-gemini-explainer`를 쓴다. **프롬프트를 재작성**해 3종 세트 숫자를 주입하고 **문장만 생성**하게 한다 | Must |
| FR-71 | **LLM이 숫자를 만들지 않는다.** 점수·승률·금액을 프롬프트에 주입한다 | Must |
| FR-72 | 실패 시 **규칙 기반 문장으로 폴백**한다(기존 `ai-coach-explainer.ts` 재사용). `explanation.source: 'rule'` | Must |
| FR-73 | **확신 표현을 프롬프트에서 금지**하고 **후처리로도 검사**한다: "확실"·"무조건"·"보장"·"100%" | Must |
| FR-74 | **목표주가·수익률 예측을 금지**한다. 프롬프트 + 후처리 양쪽 | Must |
| FR-75 | 프롬프트에 **계좌 식별자·거래소 키를 넣지 않는다.** 금액은 필요한 범위만 | Must |
| FR-76 | **프롬프트·응답을 원문 로깅하지 않는다.** 토큰 수와 지연만 | Must |
| FR-77 | LLM 호출은 **트랜잭션 밖**이다 | Must |
| FR-78 | 해설을 **생성 시 1회** 만들고 저장한다. 매 요청마다 부르지 않는다 | Must |

## 쿨다운

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | 수동 재생성 **5분 쿨다운**. `CoachGenerationLog.requestedAt`으로 판정 | Must |
| FR-81 | 초과 시 **429**. 남은 시간을 응답에 담는다 | Must |
| FR-82 | 쿨다운은 **설정값**이다 | Must |
| FR-83 | 워커 생성은 쿨다운 대상이 아니다 | Must |
| FR-84 | 실패·거부 요청도 로그에 남긴다 | Must |

## 점수 해석

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | 응답에 `scoreNote`를 담는다. **"점수는 확률이 아닙니다"** 를 화면이 표시할 근거 | Must |
| FR-91 | 점수를 확률로 변환하는 코드를 만들지 않는다 | Must |

## Acceptance Criteria

- [ ] `coach` 컨텍스트가 5개 모듈을 통합한다
- [ ] **점수 엔진 계산이 바뀌지 않았다** (이관 전/후 응답 스냅샷 동일)
- [ ] 게이트가 `policy/renderGate.ts`의 순수 함수다
- [ ] **`signalTrackRecord`를 null로 만들면 `renderable: false`다**
- [ ] **`failureCases`를 빈 배열로 만들면 `renderable: false`다**
- [ ] `reasons`가 비면 `renderable: false`다
- [ ] `blockedReason` 3종이 구분된다
- [ ] 게이트 차단이 에러가 아니다 (200 응답)
- [ ] **우회 플래그가 0건이다**
- [ ] 홈 요약(`/preview`)에도 게이트가 적용된다
- [ ] 게이트 차단 사유별 카운터가 있다
- [ ] **개별 미국 주식 신규 매수 추천이 생성되지 않는다** (합성 케이스)
- [ ] 지수/ETF 판정 데이터가 없으면 보수적으로 거부된다
- [ ] `kr_stock`이 추천 대상에서 제외되고 `excluded[]`에 담긴다
- [ ] 거부된 후보가 로그에 남는다
- [ ] 성적표가 신호 유형별로 그룹화된다
- [ ] `sample < 20`에서 `lowSample: true`다
- [ ] `coach_feedback`이 샘플에서 제외된다
- [ ] 샘플이 20개 이하다
- [ ] **성적표 쿼리 수가 200 → 3 이하다** (`DB-REQ-020`)
- [ ] 익절 플랜에 `distanceFromCurrentPct`가 있다
- [ ] **목표주가·수익률 예측이 0건이다**
- [ ] 익절 계산식이 이관 전/후 같다
- [ ] 익절 계산이 `Decimal`이다
- [ ] 익절 플랜이 3자산군을 지원한다 (`crypto` 하드코딩 0건)
- [ ] **preflight에 게이트·차단 필드가 0건이다**
- [ ] preflight에 주문 Port가 0건이다
- [ ] 행동 기록이 코드 + 수치이고 **인격 평가 문장이 0건이다**
- [ ] 기존 `behavior-coach` 응답이 하위 호환이다
- [ ] **거래 단위 라벨러가 `application/api`로 공개된다**
- [ ] LLM이 숫자를 만들지 않는다 (프롬프트 주입 확인)
- [ ] LLM 실패 시 `explanation.source: 'rule'`로 폴백된다
- [ ] **확신 표현이 후처리로 검사되고 0건이다**
- [ ] 프롬프트에 계좌 식별자·키가 0건이다
- [ ] **프롬프트·응답 원문 로깅이 0건이다**
- [ ] LLM 호출이 트랜잭션 밖이다
- [ ] 해설이 생성 시 1회만 만들어진다 (호출 카운터)
- [ ] **5분 안에 두 번 재생성하면 429다**
- [ ] 쿨다운이 설정값이다
- [ ] 워커 생성이 쿨다운 대상이 아니다
- [ ] `scoreNote`가 응답에 있다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `DB-REQ-017`~`020` · **`SRV-REQ-020`(F003 `IndicatorTrackRecord`)**
- **공개:** 거래 단위 라벨러를 F001의 `invoice`가 소비한다
- **규칙:** `ddd-domain.md` · `i18n-policy.md`(문구 정책)

## Open Questions

- **`signalType` ↔ 성적표 매핑이 1:1인지.** 아니면 카드가 어떤 성적표를 붙일지 결정할 수 없다. **FR-12 착수 전 선결**(`DB-REQ-017` Open Question).
- **성적표 표본이 실제로 몇 건 쌓여 있는지.** 거의 없으면 초기에 모든 카드가 미렌더된다 → FR-32의 초기 정책 결정이 필요하다.
- **지수/ETF 판정 데이터**(`DB-REQ-018` Open Question). 없으면 미국주식 추천을 전부 거부해야 한다.
- 미국주식 추천에 필요한 `TechnicalIndicator` 계산이 현재 크립토 전용인지.
- `behavior-coach`의 기존 판정이 집계 기반인지 거래 단위인지.
- 피드백을 점수 엔진에 반영할지.
