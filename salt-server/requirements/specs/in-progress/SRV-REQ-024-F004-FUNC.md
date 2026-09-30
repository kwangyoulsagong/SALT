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
| `behavior-coach/*` + `investment-insight/behavior-analysis` | `coach/domain/policy/behaviorFact` (~~거래 단위 라벨러 — F001이 소비~~ ADR-002 로 소비처 삭제) |
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
blockedReason = 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing' | 'insufficient_sample'  // 마지막은 종목 경로(D11)
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

글로벌 플랜 1-3절: **개별 미국 주식 신규 매수 추천 금지.** 지수/ETF 단위 또는 보유 종목 관리(비중·손절)만. (세금은 ADR-002 로 빠졌다)

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
| FR-30 | 신호 유형별로 그룹화한다: `sample` · `winRate` · `avgReturn` · `worstObservedReturn` | Must |
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
| FR-41 | **`gapFromCurrent`를 추가**한다(현재가와 가격선의 차이, 호가 통화 금액, 부호 있음). 화면이 계산하지 않게. **% 필드는 두지 않는다**(D13) | Must |
| FR-42 | 가격은 **내 규칙 기반**이다. **목표주가·수익률 예측을 만들지 않는다**(1-3절) | Must |
| FR-43 | 기존 계산식(`profitRate > 10 ? currentPrice * 0.94 : averageBuyPrice * 0.92` 등)을 **바꾸지 않는다.** 이관만 한다 | Must |
| FR-44 | 계산을 `Money`·`Decimal`로 올린다. 현재 `Float` 산술이다 | Must |
| FR-45 | `assetType`을 `crypto`에서 3자산군으로 확장한다. 현재 `where: { assetType: 'crypto' }`로 하드코딩되어 있다 | Must |

## 주문 전 계산 (`policy/preflight`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 진입 후 비중 · 상한 초과 여부 · 최대 손실 · 손익비를 계산한다. **개정 2026-09-21**: "잔여 현금"을 뺀다 — 입금 · 현금 기록이 없다(ADR-002, 감사 문서 B13). 대신 **총자산 대비 최대손실**을 더한다(FR-152) | Must |
| FR-51 | **게이트·차단 동작이 없다.** 계산 표시 전용이다. `blocked`·`allowed` 같은 필드를 만들지 않는다 | Must |
| FR-52 | **주문을 실행하지 않는다.** 이 정책에 주문 관련 Port가 없다 | Must |
| FR-53 | 기존 계산을 바꾸지 않는다. 이관만 한다 | Must |

## 행동 기록 (`policy/behaviorFact`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 편향 판정을 **사실 서술 문장의 근거**로 변환한다. 서버는 **코드 + 수치**만 주고 문구는 프론트가 만든다 | Must |
| FR-61 | **인격 평가 문구를 서버가 만들지 않는다.** "당신은 패닉셀러입니다" 같은 문장을 생성하지 않는다 | Must |
| FR-62 | 기존 `behavior-coach` 응답 계약을 **유지**한다(하위 호환). `factCode` + `params`를 **추가**한다 | Must |
| FR-63 | ~~거래 단위 라벨러를 `application/api`로 공개한다. F001의 `invoice`가 ACL로 소비한다~~ **개정 2026-09-21 (ADR-002)**: 소비처(F001 청구서)가 삭제됐다. 라벨러를 만들지 않는다 | — |
| FR-64 | ~~기존 판정이 집계 기반이면 라벨러를 새로 쓴다~~ **개정 2026-09-21**: FR-63 과 함께 무효. 기존 집계 판정 + FR-62 의 `factCode`/`params` 로 충분하다 | — |
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

## 종목 판단 경로 — 투자 화면 우측 패널 · 상세 분석 페이지 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · D4 · D7 · B1 · B3 · B9 · B10 · B17 · B18 · B39 · D11 · D12 · D13.
`FEATURE-004` 는 `FEATURE-000` FR-33(우측 프리뷰 AI 카드)을 이관받아 **우측 AI 코치 패널**로 키웠다. 서버 쪽 출발점은
`GetSymbolCoach`(`src/coach/application/GetSymbolCoach.ts`) — 이미 두 모드 판단(`dualDecision`)을 한 번에 만든다.
빠진 것은 **3종 게이트 · 바이존 · 게이지 적중률 · 신뢰도 제거**다.

### A. 모드 판단과 신뢰도 (D3 · B10)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-100 | 종목 판단은 **두 모드를 늘 함께** 계산해 내려보낸다(`modes.scalp` · `modes.longTerm`). 화면이 모드를 바꿔도 서버를 다시 부르지 않는다 — 기존 `dualDecision` 설계를 유지한다 | Must |
| FR-101 | 판단 라벨은 서버 **중립 라벨 4종**이다: `review_short_opportunity`(단타 기회 후보) · `review_accumulation`(장기 모아가기 후보) · `wait`(관망) · `avoid`(지금은 피하기). **"매수"·"매도" 명령형 라벨을 만들지 않는다**(`modeDecision.ts` 기존) | Must |
| FR-102 | **신뢰도를 없앤다.** `makeModeDecision` 의 `confidence`(`0.45 + score/200`) 필드를 응답 타입에서 제거하고, `CoachExplanationInput.confidence`(Gemini 입력)도 뺀다. 점수 + `scoreNote` + 3종이 대체한다 | Must |
| FR-103 | **유효시간은 서버가 정한 하나의 표기**다. 기존 `timeframe`(~~`5m-24h` · `1w-1y`~~ → **`24h` · `30d`**, 개정 2026-09-24 C05 — 채점 기간과 같게)을 `validity.code` 로 싣고, 해설(`CoachExplanation.timeframe`)도 **LLM 이 만들지 않고 이 값을 주입**한다. 화면 자체 값(프로토타입 "25분 / 30일") 금지 | Must |
| FR-104 | 모드별로 **3종 게이트**를 적용한다: `renderable` · `blockedReason` · `trackRecord` · `failureCases`. 게이트 함수는 FR-10 의 `renderGate.ts` 를 그대로 쓴다 — 저장 추천과 종목 판단이 **같은 함수**를 지난다 | Must |
| FR-105 | 근거 = `reasons[]`(비어 있지 않음). 적중률 = 매핑 표(FR-130)로 찾은 `<mode>.<action>` 성적표. 실패사례 = 같은 `<mode>.<action>` 스냅샷 중 **빗나간 것**(FR-134 · D11). `IndicatorTrackRecord` 를 쓰지 않는다 | Must |
| FR-106 | `renderable: false` 여도 **200** 이고, 게이지 · 뉴스 · 바이존은 그대로 응답한다. 게이트는 **판단 블록**에만 걸린다 | Must |
| FR-107 | **종목 판단 스냅샷을 남긴다.** 워커가 추적 자산(D8 — 최대 10 + 보유) × 2모드 판단을 `InvestmentInsight(kind: symbol_judgment, mode, signalType)` 로 upsert 한다(`DB-REQ-017` FR-50~53). 스냅샷이 없으면 종목 경로 성적표 표본이 영원히 0이다 | Must |
| FR-108 | 헤드라인 문구(`headline`)에 확신 표현 · 목표가 · 수익률이 없다. 기존 문구("손절 기준 없이 진입하지 마세요")는 행동 서술이라 유지한다 | Must |

### B. 스마트 바이존 — 보유 = 내 규칙 가격, 미보유 = 관찰 구간 (D2)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-110 | 응답에 모드별 `zone` 을 싣는다. **판별 필드 `kind`** 로 셋 중 하나다: `held_rule` · `observation` · `unavailable` | Must |
| FR-111 | **`held_rule` (보유)**: `calculateProfitPlan`(`domain/policy/profitPlan.ts`)의 3단계를 그대로 쓴다 — `protect_loss`(손실 제한) · `first_profit`(1차 익절 검토) · `trend_hold`(추세 유지 = 평단 × 1.25, 스토리보드의 "2차"). 각 단계에 `price` · `priceGap`(현재가와의 가격 차이, D13) · `ratio`. 계산식을 바꾸지 않는다(FR-43) | Must |
| FR-112 | **`observation` (미보유)**: 과거 가격 분포 기반 **관찰 구간** `lower` · `mid` · `upper` + `ruleCode` + `lookback` + `sample`. 기본 규칙(기본값 — 착수 전 확정): 단타 = 최근 24시간 `m5` 종가의 20 · 50 · 80 백분위, 장기 = 최근 1년 일봉 종가의 20 · 50 · 80 백분위. **가격 목표가 아니다** | Must |
| FR-113 | 둘 다 `notPrediction: true` 를 싣는다. 화면이 `예측 아님` 라벨을 붙일 근거다 | Must |
| FR-114 | **수익률 % 필드를 만들지 않는다.** 현재가와의 거리는 `priceGap`(금액)뿐이고 **거리 % 도 없다**(D13). 이름 · 문서에서 "수익"이라 부르지 않는다. 예상 도달 시점 · 확률 필드 0건 | Must |
| FR-115 | **D12**: `us_stock` · 미보유 · 지수/ETF 아님 → `unavailable`(`out_of_scope`). `kr_stock` → `unavailable`(`excluded_asset`). 가격 이력 부족 → `unavailable`(`insufficient_price_history`) | Must |
| FR-116 | 보유 판정 · 평단은 `PortfolioProbe`(기존 `PortfolioTransaction` 집계)에서 온다. 원장 확장 없음(ADR-002) | Must |
| FR-117 | 구간 스냅샷을 워커가 `type: smart_buy_zone` 으로 남긴다(`DB-REQ-017` FR-30 개정). 옛 예측형 매수존(매수 적정가 · 수익률) 로직을 되살리지 않는다 | Should |

### C. 게이지 아래 적중률 한 줄 (B9)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-120 | 응답에 `gaugeTrackRecords[]` 를 싣는다: `{ gauge, bucketCode, currentValue, horizonDays: 30, sample, p25, median, p75, positiveRate, lowSample }` | Must |
| FR-121 | 값은 **`GaugeTrackRecord` 사전 집계**에서 읽는다(`DB-REQ-017` FR-55). 입력 = `MarketSentiment` 이력 + `PriceHistory` → "이 구간에 들어간 뒤 30일 수익률 분포" | Must |
| FR-122 | `sample < 20` → `lowSample: true`. 표본 0 이면 그 게이지 항목을 `null` 로 둔다(한 줄이 사라진다 — 근거 없는 문장보다 낫다) | Must |
| FR-123 | 이 값은 **과거 분포**다. "앞으로 +X%" 로 읽히는 필드명 · 문구를 서버가 만들지 않는다. 문구는 프론트(`예측 아님` 포함) | Must |
| FR-124 | `sentiment` 는 Must, `smart_money`(대량 체결 순매수 구간)는 같은 계약으로 Should | Should |

### D. `signalType` ↔ 성적표 ↔ 실패 이력 매핑 표 (B18)

매핑은 **데이터로 시드**한다(`DB-REQ-019` FR-20~24 · FR-45). 아래가 그 시드의 원본이다.

| 판단 경로 | 입력 | `signalType` | 성적표 표본 (`signal-performance?groupBy=signalType`) | 실패 이력 (`IndicatorTrackRecord`) |
|---|---|---|---|---|
| 저장 추천 (코치 리포트 · 홈) | `recommendation.action` | `coach.buy` · `coach.sell` · `coach.hold` · `coach.rebalance` | `kind = recommendation` 행 | `signalTypes` 에 포함된 레코드 |
| 종목 판단 · 단타 | `modes.scalp.action` | `scalp.review_short_opportunity` · `scalp.review_accumulation`* · `scalp.wait` · `scalp.avoid` | `kind = symbol_judgment` · `mode = scalp` 행 | 같은 행 중 빗나간 것 (D11) |
| 종목 판단 · 장기 | `modes.longTerm.action` | `long_term.review_short_opportunity`* · `long_term.review_accumulation` · `long_term.wait` · `long_term.avoid` | `kind = symbol_judgment` · `mode = long_term` 행 | 같은 행 중 빗나간 것 (D11) |

\* 현재 `makeModeDecision` 은 단타에서 `review_accumulation`, 장기에서 `review_short_opportunity` 를 내지 않는다. 시드에는 두되 표본이 0이다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-130 | 위 표를 **이 REQ 의 계약**으로 둔다. 기존 fallback 체인(`signalKey ?? payload.mode ?? recommendation.action ?? 'ai_coach'`)을 신규 코드에서 쓰지 않는다 | Must |
| FR-131 | 매핑이 없거나 실패 이력이 연결되지 않은 `signalType` 은 **게이트 차단**이고 에러가 아니다 | Must |
| FR-132 | **표본이 없어 전부 미렌더인 초기 상태는 정상이다.** 응답에 `trackRecord.sample: 0` 을 그대로 싣고(`null` 과 구분), 화면이 "표본이 쌓이는 중"을 보여줄 근거를 준다 | Must |
| FR-133 | 게이트 차단 사유별 카운터(FR-17)를 **경로별**(저장 추천 / 종목 판단 × 모드)로 나눈다 | Must |
| FR-134 | **(D11) 종목 판단의 적중률 · 실패사례는 `symbol_judgment` 스냅샷의 사후 결과에서 온다.** 관찰 기간이 끝난 스냅샷마다 진입가(스냅샷 시각 종가)와 기간 끝 종가로 결과를 매긴다. `IndicatorTrackRecord` 를 읽지 않는다 — 판단 근거(RSI · 심리 · 대량 체결)와 다른 신호의 실패를 붙이지 않는다 | Must |
| FR-135 | **적중 판정 (B39 — 2026-09-21 사용자 확정).** 관찰 기간 = 단타 24시간 · 장기 30일. `review_*` 는 기간 수익률 > 0, `avoid` 는 ≤ 0, `wait` 는 절댓값이 단타 2% · 장기 10% 안이면 적중. 규칙은 `domain/policy` 순수 함수 하나에 둔다 | Must |
| FR-136 | **표본 독립성.** 같은 종목 · 모드 스냅샷은 관찰 기간 안에서 **첫 1건만** 표본으로 센다(1시간 버킷이 겹쳐 표본이 부풀지 않게) | Must |
| FR-137 | **표본 < 20 이면 `renderable: false` · `blockedReason: insufficient_sample`** 이고 `trackRecord.sample` 은 실제 값을 싣는다. 표본 ≥ 20 인데 빗나간 것이 0건이면 `failure_cases_missing` 으로 막는다 — 실패 없는 성적은 표본이 치우친 신호다 | Must |
| FR-138 | **피하기의 근거 = `reasons ∪ risks`** (2026-09-21 사용자 확정). 피하기는 위험 신호가 곧 이유라 `makeModeDecision` 이 `risks` 에만 넣는다. 나머지 판단은 `reasons` 만 근거로 센다. 규칙은 `judgmentEvidence` 한 곳 | Must |

### E. 해설 (B3)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-140 | 즉석 해설(`POST /api/ai-coach/explain`)은 `modeReasoning` · `keyDrivers` · `risks` · **`newsSummary`(최대 5줄)** · `disclaimer` 를 준다. **예상 수익 범위는 없다**(`GeminiCoachExplainer` · `CoachExplanation` 에서 2026-09-18 제거 — 되살리지 않는다) | Must |
| FR-141 | 해설 응답에 같은 종목 · 모드의 `renderable` · `trackRecord` · `failureCases` 를 함께 싣는다. **판단이 `renderable: false` 면 해설을 생성하지 않는다**(LLM 을 부르지 않는다) — 3종 없는 해설이 추천처럼 읽힌다 | Must |
| FR-142 | `newsSummary` 는 입력으로 준 기사(`news[]`)만 요약한다. 기사가 0건이면 빈 배열이다 | Must |

### F. 주문 전 체크 (B1)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-150 | **목표가(`takeProfitPrices`)는 선택 입력이다.** 서버가 기본값을 채우지 않는다. 없으면 `riskRewardRatio: null` | Must |
| FR-151 | 주문 · 외부 링크 필드를 만들지 않는다(`orderExecution: false` 사실 서술만 유지) | Must |
| FR-152 | **`maxLossOfTotalRate`(총자산 대비 최대손실)** 를 추가한다: `maxLossAmount / totalValue`. 서버 계산, 원 단위 · 비율 | Must |
| FR-153 | 손절 칩(−1.5 · −3 · −5 · −8 · −12%)은 화면이 `stopPrice` 로 바꿔 보낸다 — **환산도 서버**에서 한다: 요청에 `stopLossRate` 를 받으면 서버가 `stopPrice` 를 계산한다 | Must |

### G. 코치 리포트 · 추천 근거 상세 (B15 · B17 · B2)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-160 | 성적표 그룹 응답에 **신호 후 30일 수익률 분포**를 싣는다: 구간별 표본 수(`≤−20% · −20~−10 · −10~0 · 0~10 · 10~20 · ≥20%`) + 하위 25% · 중앙값 · 상위 25% (B17). 과거 분포이고 예측이 아니다 | Must |
| FR-161 | 실패 이력과 적중 이력을 **같은 모양**으로 싣는다(`hits[]` · `misses[]` 같은 필드 구조, 같은 상한 3건). 한쪽만 요약하지 않는다(B2) | Must |
| FR-162 | 코치 탭은 대화 + 추천 카드, F004 섹션은 코치 리포트로 간다(B15) — **서버 계약은 바뀌지 않는다**(`/api/coach/detail` 그대로) | Must |

### H. 범위 밖

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-170 | **관심 종목 목록 응답에 판단 · 신호 필드를 붙이지 않는다**(D4). 판단은 종목 판단 경로에서만 | Must |
| FR-172 | 판단 게이트 · 성적 · 실패사례 · 성적표는 **`sample_origin = live` 표본만** 센다(개정 2026-09-24, C06 · `DB-REQ-017` FR-60). 로컬에서 합성 표본을 세려면 `JUDGMENT_COUNT_SYNTHETIC=true` — **운영에서 켜면 기동이 막힌다**. 워커의 간격 · 채점 대상은 설정과 무관하게 늘 `live` | Must |
| FR-171 | 알림 만들기 · 사용자 조건 알림(B19)은 이 REQ 에 없다 | — |
| FR-173 | **(F010 슬라이스 0) 판단 지표는 모드별 봉이다** — 단타 1시간봉 · 장기 일봉 · 국면(BTC) 일봉(`COACH_INDICATOR_TIMEFRAME` · `REGIME_INDICATOR_TIMEFRAME`). 지표 결측(`technical_indicator`)도 모드별로 판정한다. 채점 종가는 단타 5분봉 · 장기 일봉(`JUDGMENT_PRICE_TIMEFRAME`) — `closeAtOrAfter` 는 주기 없이 부를 수 없다 | Must |
| FR-174 | **(F010 슬라이스 0) 적중 경계는 왕복 수수료 0.1%(`ROUND_TRIP_COST`)** — 후보 `r > 0.001` · 피하기 `r ≤ 0.001` · 관망은 FR-135 그대로. 성적표(`trackRecord` · 성적표 그룹)에 같은 표본의 **비용 넘겨 오른 비율(`alwaysUpRate`)** 과 **초과 적중률(`excessWinRate` = 적중률 − 기저율; 후보는 항상 오른다 대비 · 피하기는 항상 안 오른다 대비 · 관망 `null`)** 을 싣는다. 기존 채점 행은 마이그레이션 `20260928100100` 이 같은 규칙으로 재판정 | Must |
| FR-175 | **(F010 슬라이스 0) 저장 추천은 불변 원장에 남는다** — `GenerateCoachRecommendation` 이 추천 1건마다 `coach_recommendation_snapshots`(`DB-REQ-017` FR-61)에 사용자 · 종목 · 행동 · 점수 · 근거 · 진입 시세를 쓴다(같은 사용자 · 종목 · 행동은 30일에 1건). 기록 실패는 추천을 막지 않는다. `EvaluateCoachRecommendations` 가 30일 뒤 일봉 종가로 채점한다(`buy` > 0.1% · `sell` < −0.1% · `hold` · `rebalance` ±10%). 판정 워커(`investment-insight`)가 종목 판단 다음에 돈다 | Must |
| FR-176 | **(F010 슬라이스 0) 저장 추천의 적중률 · 실패사례는 FR-175 원장에서만 온다.** `signal-performance` · 코치 상세 `signalTrackRecord` · `failureCases` 모두. "판단 뒤 첫 종가 vs 최신 종가" 경로(`collectPerformanceSamples`)는 삭제. **FR-32 기본안(표본 1건이면 통과) 폐기** — 표본 < 20 이면 `insufficient_sample`(FR-137 과 같은 기준). 표본 0 은 `signal_track_record_missing` 그대로 | Must |
| FR-177 | **(F010 슬라이스 1) 대형 체결 워커 수집.** `market` `CollectWhaleTrades` 가 5분마다 24시간 거래대금 상위 50 + 관심 종목을 돈다. 심볼마다 지난 회차에 훑은 마지막 체결 뒤부터 업비트 `/trades/ticks` 를 `cursor` 로 넘겨(10쪽 상한, 넘으면 `truncated`) 5천만원 이상 체결을 **전부** 저장한다 — 체결 시각(`traded_at`, 발생) · 체결 id(`sequential_id`, 중복 방지). 재기동 뒤 첫 회차는 1시간까지만 거슬러 간다. `/smart-money` 저장의 10건 상한 폐지. 코치 최근 대형 체결 조회는 발생 시각 순 | Must |
| FR-178 | **(F010 슬라이스 1) 예측 원장 발행.** `coach` `PublishJudgmentLedger` — 추적 종목 × 두 모드 판단을 **UTC 날마다 한 번** `judgment_ledger` 에 쓴다(그날 이미 쓴 조합은 재료도 다시 모으지 않는다). 행: 규칙 버전(`mode-decision@1`) · 점수 · 행동 · **항목별 기여**(`scoreModeDecision` — 재료 없으면 `value: null`) · 재료 값과 **발생 시각**(시세 · 심리 · 모드 봉 지표 · 대형 체결 최이른/최늦은) · 판단 시각 · 모드별 결측 · BTC 국면(`detectMarketRegime`, BTC 일봉 RSI + 공포탐욕) · 진입가 · 진입가 시각. 판단 계산은 화면 · 스냅샷과 같은 함수. 항목 기여는 **응답에 싣지 않는다** | Must |
| FR-179 | **(F010 슬라이스 1) 규칙 `mode-decision@2`.** 사전등록 `rule-ic@1` 판정 반영: 단타 24시간 변화(>3% −12 · <−3% +10) · 단타 심리(≥70 −5 · ≤35 +4) **부호 반전**, 대형 체결(두 모드) · 장기 심리 **가중 0** — 점수 · 근거 문장 · 해설 사실에서 빠지고 값은 원장 기여로만 남는다(`SCORED_ITEMS`). 장기 24시간 · 일봉 RSI · 단타 1시간 RSI · 결측 감점 유지. 근거 문장은 점수 방향과 같은 칸(감점 = 위험 · 가점 = 근거) — @1 의 장기 24시간은 어긋나 있었다. **후보 문턱 70 · 관망 50 은 그대로**(표본 안에서 낮춰 보면 후보 칸 시장 대비 초과 수익 0) → 지금 근거로는 후보가 나오지 않는다. 스냅샷 · 원장에 규칙 버전, 성적표는 현재 버전만 센다(합성은 예외). v2 성적은 백테스트로 주장하지 않는다 | Must |
| FR-180 | **(F010 슬라이스 2) 익절 계획을 실현 변동성으로.** `calculateProfitPlan(holding, annualizedVolatility)` — 변동성이 있으면 손절 평단 × e^(−1σ) · 1차 익절 × e^(+2σ) · 추세 유지 × e^(+3σ), σ = 연율 σ × √(20/365)(삼중 장벽 라벨과 같은 정의, 사전등록 `regime-gate@1` [stops]). +1σ 넘으면 손절을 현재가 −1σ 로 올리고, +2σ 넘으면 1차 익절이 현재가. 상태 문턱도 σ(−1σ 손절 검토 · +1σ 손절선 올리기 · +2σ 익절 검토). 변동성이 없거나 막히면 **예전 고정 비율 그대로**(특성화 테스트 유지). 결과에 `basis`(`volatility` · `fixed`) · `sigmaHorizon`. 세 화면(익절 계획 목록 · 보유 zone · 코치 상세 `exitPlans`)이 같은 함수 — 변동성은 `ForecastReader.symbolRisk` 한 쿼리, 실패하면 고정. 경고 문구는 상태에서 | Must |
| FR-181 | **(F010 슬라이스 2) 원장 재료에 국면 · 종목 변동성.** `PublishJudgmentLedger` 가 `materials.market`(BTC 200일선 위 여부 · HMM 고변동 확률 · 365일 낙폭 · 관측 시각 — `forecast.v_market_regime`) · `materials.risk`(연 변동성 · 90일 BTC 베타 — `v_realized_vol`)를 남긴다. **점수에 쓰지 않는다**(같은 재료면 점수 동일 — 테스트). 읽기 실패는 그 칸만 `null`. jsonb 칸 추가(마이그레이션 없음), 과거 행은 칸이 없다 | Must |
| FR-182 | **(F010 슬라이스 5) 목표 비중 안내 `GET /api/coach/target-weights` — 확률 없음.** 대상 = 보유 코인 ∪ {BTC, ETH}. 규칙(사전등록 `target-weight@1` [rule]): 역변동성 s_i = (1/σ_i)/Σ(1/σ_j) · 묶음 σ = Σ s_i σ_i(상관 1, 상한) · 노출 = min(1, 목표 σ ÷ 묶음 σ) · w_i = min(노출 × s_i, 한 종목 상한), 상한에 잘린 몫은 현금. `coach/domain/policy/targetWeight.ts` — Python `domain/target_weight.py` 와 **같은 고정 벡터** 테스트. 방향 판단 · 기대 R · 켈리 · 확률 없음(`meta-model@1` · `@2` 미채택) | Must |
| FR-183 | **σ 는 `v_realized_vol.ewma`**(EWMA λ 0.94 연율 그 자체). 사이즈 계산의 `annualized`(QLIKE 게이트 통과분)를 쓰지 않는다 — 등록 [protocol] 이 게이트 없는 EWMA 로 정했고 백테스트도 그렇게 돌았다. 실측: ETH 가 `no_skill_vs_baseline` 으로 `annualized` 가 없어 BTC 한 종목만 비중을 받았다(`c95d78c` 로 고침). σ 가 없는 종목(이력 부족 · 시세 끊김 · 3일 넘게 낡음)은 `excluded[]` + 사유 — 0 으로 채우지 않는다 | Must |
| FR-184 | **전체 = 투자금(현금 포함).** 프로필 `investableCapital`(`DB-REQ-031` FR-9, `PUT /api/coach/risk-budget` `investableCapital`, 0 초과 · 1조 이하 · `null` 은 지움). 없으면 코인 평가금 합을 전체로(`basis: crypto_value`), 투자금이 보유보다 작으면 보유 합(`capitalBelowHoldings`), 둘 다 없으면 `status: no_capital`(비중 % 만 뜻이 있다). 앱은 현금을 모른다 — 수동 입력 · 계좌 연동 없음 | Must |
| FR-185 | **행 · 합계.** 종목마다 목표 · 지금 비중 · 차(원 · 수량 — 부족은 내림, 초과는 올림) · 상태 `under`/`over`/`at`(차가 업비트 최소 주문 5,000원 미만이면 `at`) · 손절선 = 기준가 × exp(−σ√(20/365))(익절 계획 −1σ 와 같은 정의) · 목표 비중으로 들고 손절선에 닿을 때 손실(양쪽 수수료 0.05%, 갭 없음). 합계: 목표 · 지금 노출 · 현금 몫 · 묶음 σ · 목표 BTC 베타 합(베타 있는 종목만 + `betaCoveredWeight`) · 모두 손절선에 닿을 때 손실 ÷ 이번 달 남은 손실 예산(게이지와 같은 `loadRiskSnapshot`). **무효화 3조건**: `expiresAt` 다음 월요일 00:00 UTC(09:00 KST, 백테스트 리밸런스 날) · `sigmaBand` σ ±25% · `stopPriceKrw`. 지시 문구 없음 — 숫자와 상태 코드만 | Must |
| FR-186 | **3종 고지 상시.** 근거 = 행마다 σ · 규칙(목표 σ · 기본값 여부 · 상한). 과거 성적 · 실패 사례 = `targetWeightRecord.ts` 상수 — 리포트 core(BTC · ETH) 1차 기록 5개 중 사용자 목표 σ 에 가장 가까운 것(같은 거리면 작은 쪽) · BTC 보유 · `claims`(덜 빠짐 · 타이밍 · 목표 근처 — 등록 [claims] 판정 그대로) · 놓친 상승 3 · 잃은 달 3. 테스트가 리포트 표 · 실패 사례 달과 상수를 대조한다. σ 가 있는 종목이 없으면 `renderable: false` · `blockedReason: no_volatility`. `orderExecution: false` | Must |
| FR-187 | **(target-weight@2) 알트는 규칙 밖.** 사전등록 `target-weight@2` [alt_share.adopt] 결과 채택 없음 → `TARGET_WEIGHT_ALT_SHARE = null` — 규칙 대상은 BTC · ETH 뿐, 보유 알트는 `excluded[]`(`reason: no_record`, 평가금 포함)로만 나간다. 목표 0 을 `over` 로 두면 매도 지시가 되므로 부족 · 초과 · 금액을 만들지 않는다. core 비중은 보유 알트와 무관해지고 라이브 원장 모델 포트폴리오(`v_target_weight_live`)와 같은 비중이다. `totals.outsideRuleWeight` = 규칙 밖 보유 평가금 ÷ 전체 | Must |
| FR-188 | **부족분은 쓸 수 있는 돈 안에서만.** `fundable` = max(0, 전체 − 코인 평가금) + core 초과분. 부족 합이 넘치면 부족 행의 원 · 수량을 같은 비율로 줄이고 `gapCapped: true`. 줄인 값이 최소 주문(5,000원) 미만이면 `status: no_room`. 목표 비중 자체는 줄이지 않는다 — 알트를 팔아 core 를 채우는 계산이 나오지 않게 | Must |
| FR-189 | **알트 몫 판정 기록 상수** `TARGET_WEIGHT_ALT_SHARE_RECORD` — 리포트 `target-weight-target-weight-2-2026-09-29.md` 의 0.15 행(a 0.10 · 0.20 ΔCalmar [점, 하한, 상한] · CAGR · core CAGR) · `adopted: null` · `survivorshipBias: true`. 테스트가 리포트 판정 줄 · CI 칸과 대조(소수 2자리 허용). 응답 `altShare` | Must |
| FR-190 | **core 모델 포트폴리오 라이브 성적** — `ForecastReader.targetWeightLive(target)` 가 `forecast.v_target_weight_live`(`DB-REQ-029` FR-21) 의 사용자 목표 σ 에 가장 가까운 등록 목표 한 행을 읽는다(PK 인덱스 · 0.015ms). 응답 `live`(첫 리밸런스 2026-10-05 전이면 `null`) · `liveMinWeeks` 30 · `recordSource` = 라이브 `nWeeks ≥ 30` 이면 `live`, 아니면 `backtest` | Must |
| FR-191 | **거래소 투자유의 종목은 판정을 내지 않는다**(F010 슬라이스 6). `judgmentGate` 의 첫 검사 — `exchangeWarning` 이면 근거 · 표본 · 실패사례와 무관하게 `blockedReason: exchange_warning`. `GetSymbolCoach` 가 `ForecastReader.marketWarnings([symbol])`(`forecast.v_market_warning`, `DB-REQ-029` FR-22, 3일 신선도)로 읽는다. 읽기 실패 · 스냅샷 없음 · 3일 넘음은 **막지 않는다**(fail-open — 모르는 것을 유의로 지어내지 않는다). 원장(`judgment_ledger` · 판단 스냅샷)은 그대로 쓴다 — 규칙을 재는 기록이지 화면이 아니다 | Must |
| FR-192 | 응답 `exchangeFlag: { warning, cautions[], fetchedAt } \| null` — 주의(caution)만 켜졌으면 판정은 그대로 나가고 소비처가 코드로 한 줄을 고른다. 코드는 업비트 원문 5종 그대로(`PRICE_FLUCTUATIONS` 등) | Must |
| FR-193 | **추천 후보에서 투자유의 종목을 뺀다** — `withoutExchangeWarning(ranked, flags)`(순위 유지, 보유 종목의 매도 후보 포함). `GenerateCoachRecommendation` 이 같은 포트로 읽고 실패는 빈 맵 | Must |

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
- [ ] 익절 플랜에 `gapFromCurrent`가 있다
- [ ] **목표주가·수익률 예측이 0건이다**
- [ ] 익절 계산식이 이관 전/후 같다
- [ ] 익절 계산이 `Decimal`이다
- [ ] 익절 플랜이 3자산군을 지원한다 (`crypto` 하드코딩 0건)
- [ ] **preflight에 게이트·차단 필드가 0건이다**
- [ ] preflight에 주문 Port가 0건이다
- [ ] 행동 기록이 코드 + 수치이고 **인격 평가 문장이 0건이다**
- [ ] 기존 `behavior-coach` 응답이 하위 호환이다
- [ ] ~~거래 단위 라벨러가 `application/api`로 공개된다~~ (ADR-002 로 무효)
- [ ] preflight 에 잔여 현금 필드가 0건이고 `maxLossOfTotalRate` 가 있다
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
- [ ] 종목 판단이 두 모드를 한 응답에 싣는다
- [ ] **종목 판단 응답 · 해설 입력에 `confidence` 가 0건이다**
- [ ] 판단 라벨이 중립 4종이고 "매수"·"매도" 라벨이 0건이다
- [ ] 유효시간이 `validity.code` 하나이고 해설의 `timeframe` 이 그 값과 같다
- [ ] **종목 판단에서 `trackRecord` 를 null 로 만들면 `renderable: false` 다** (모드별)
- [ ] 종목 판단 `renderable: false` 에서도 게이지 · 뉴스 · 바이존이 응답된다
- [ ] 워커가 종목 판단 스냅샷을 (종목 · 모드 · 버킷)당 1건 남긴다
- [ ] 보유 종목 `zone.kind = held_rule` 이고 가격이 `calculateProfitPlan` 과 같다
- [ ] 미보유 크립토 `zone.kind = observation` 이고 하단 ≤ 중앙 ≤ 상단이다
- [ ] 미보유 개별 미국 주식이 `unavailable(out_of_scope)` 다
- [ ] `zone` 에 수익률 · 목표가 · 확률 필드가 0건이고 `notPrediction: true` 다
- [ ] `gaugeTrackRecords` 가 사전 집계에서 오고 표본 < 20 에서 `lowSample: true` 다
- [ ] 매핑 표 12행이 시드되고 fallback 체인 사용이 신규 코드에 0건이다
- [ ] 표본 0 이 `sample: 0` 으로 오고 `null` 과 구분된다
- [ ] 게이트 카운터가 경로 · 모드별이다
- [ ] 해설에 `newsSummary` ≤ 5 가 있고 예상 수익 필드가 0건이다
- [ ] 판단 `renderable: false` 에서 해설 요청이 LLM 을 부르지 않는다
- [ ] preflight 목표가를 비우면 `riskRewardRatio: null` 이고 서버 기본값이 0건이다
- [ ] 성적표 그룹에 30일 수익률 분포가 있다
- [ ] 적중 · 실패 이력이 같은 구조 · 같은 상한이다
- [ ] 관심 종목 응답에 판단 필드가 0건이다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `DB-REQ-017`~`020` · **`SRV-REQ-020`(F003 `IndicatorTrackRecord`)**
- ~~**공개:** 거래 단위 라벨러를 F001의 `invoice`가 소비한다~~ — ADR-002 로 소비처 삭제
- **짝:** `DB-REQ-017` FR-50~59 · `DB-REQ-018` FR-60~68 (종목 판단 · 게이지)
- **규칙:** `ddd-domain.md` · `i18n-policy.md`(문구 정책)

## Open Questions

- **`signalType` ↔ 성적표 매핑이 1:1인지.** 아니면 카드가 어떤 성적표를 붙일지 결정할 수 없다. **FR-12 착수 전 선결**(`DB-REQ-017` Open Question).
- **성적표 표본이 실제로 몇 건 쌓여 있는지.** 거의 없으면 초기에 모든 카드가 미렌더된다 → FR-32의 초기 정책 결정이 필요하다.
- **지수/ETF 판정 데이터**(`DB-REQ-018` Open Question). 없으면 미국주식 추천을 전부 거부해야 한다.
- 미국주식 추천에 필요한 `TechnicalIndicator` 계산이 현재 크립토 전용인지.
- ~~`behavior-coach`의 기존 판정이 집계 기반인지 거래 단위인지.~~ — 라벨러 무효(FR-63 개정)로 결정할 필요가 없어졌다.
- 피드백을 점수 엔진에 반영할지.
- ~~**Q3**~~ — 2026-09-21 D12 로 닫힘(FR-115).
- ~~**종목 판단의 실패 이력은 어디서 오는가.**~~ **2026-09-21 D11 로 닫힘** — `symbol_judgment` 스냅샷(FR-107)의 사후 결과(FR-134~137). 적중 판정 세부(B39)는 2026-09-21 확정.
- 관찰 구간 규칙 파라미터(FR-112 — 기간 · 백분위수)의 확정. 20/80 은 스토리보드 값이 아니라 이 REQ 의 기본값이다.
- 종목 판단 스냅샷의 시간 버킷과 표본 독립성(`DB-REQ-017` Open Question).
- ~~거래 단위 라벨러~~ — ADR-002 로 닫힘.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 신규 FR-100~171: 종목 판단 경로(두 모드 · 중립 라벨 · **신뢰도 제거**(D3) · 유효시간 단일 표기 · 3종 게이트(B10) · 판단 스냅샷), 스마트 바이존(D2 — 보유 규칙 가격 / 미보유 관찰 구간 / Q3 보수안), 게이지 적중률(B9), **`signalType` 매핑 표**(B18), 해설 뉴스 5줄 · 예상 수익 없음(B3), 주문 전 체크(B1 — 목표가 빈칸 · 총자산 대비 최대손실), 30일 수익률 분포(B17) · 적중/실패 동등(B2), 관심 종목 신호 범위 밖(D4). 개정: FR-50(잔여 현금 제거) · FR-63/64(라벨러 무효 — ADR-002) · 범위 제한 절의 "세금" 삭제 |
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D11 ~ D13 반영. 신규 FR-134~137(종목 판단 실패 이력 = 스냅샷 사후 결과 · 적중 판정 B39 · 표본 독립성 · `insufficient_sample`). FR-41 · FR-105 · FR-111 · FR-114 · FR-115 개정(D13 · D11 · D12). Open Question 2건 닫음 |
| 2026-09-23 | **슬라이스 13 구현 (쿨다운).** FR-80~84 — 쿨다운 기준을 **받아들인 수동 요청**으로 정했다(거부는 늘리지 않고, 실패는 건다 · 워커는 제외). 쿨다운 초는 env `COACH_REGENERATE_COOLDOWN_SECONDS`. 판정은 `policy/generationCooldown.ts` |
| 2026-09-23 | **슬라이스 12 구현 (코치 상세).** 저장 추천 게이트 `policy/coachDetail.ts` `recommendationGate`(FR-10 — `renderGate.ts` 가 아니고 `judgmentGate` 와 합치지 않았다: 표본 기준과 사유 enum 이 다르다) · FR-11 · 12 · 14 · 15 · 32 · 33 · FR-23(`excluded[]`) · FR-40~43(`gapFromCurrent` — 스마트 바이존과 같은 `priceGap`) · FR-60~62(`toBehaviorFact`) · FR-90 · 91. FR-13 은 게이트 조건만 — 출처 테이블이 없다. 근거 `reports/checklists/SRV-REQ-024.md` |
| 2026-09-23 | **슬라이스 11 구현.** 성적표 그룹(FR-30 · 31 · 35 · 36)과 수익률 분포 · 적중/실패 동등(FR-160 · FR-161). 분포 기간은 **그룹의 관찰 기간**이다(`SRV-REQ-025` 코드블록 개정). FR-32~34 는 무인자 경로의 기존 동작이라 범위 밖. 근거 `reports/checklists/SRV-REQ-024.md` |
| 2026-09-21 | **슬라이스 1 구현 (`requirements/specs/in-progress/F004-symbol-judgment-slice.md`).** 닫힘: FR-100 · FR-101 · FR-102(신뢰도 제거) · FR-103(`validity.code`) · FR-104~106(게이트 — `renderGate.ts` 대신 `policy/symbolJudgment.ts` 의 `judgmentGate`) · FR-107(스냅샷 — **`InvestmentInsight` 대신 별도 테이블**, `DB-REQ-017` 참고) · FR-131 · FR-132 · FR-134~137. 남음: B절(zone) · C절(게이지) · E~G절 · FR-130 매핑 시드 · FR-133 카운터 |
| 2026-09-21 | **슬라이스 2 구현 (`requirements/specs/in-progress/F004-zone-gauge-slice.md`).** 신규 FR-138(피하기 근거 = `reasons ∪ risks`, 사용자 확정). 닫힘: FR-110~116(zone — 관찰 구간 최소 표본 = 기대 캔들 수의 절반) · FR-120~123(게이지 — `sentiment`). 남음: FR-115 `excluded_asset`(자산군 enum) · FR-117 · FR-124(Should) |
| 2026-09-24 | **F009 슬라이스 0 — C04.** FR-30 의 `maxDrawdown` 을 `worstObservedReturn` 으로 개정(`SRV-REQ-025` FR-55). 최저 단일 관찰 수익률이지 MDD 가 아니다 |
| 2026-09-24 | **F009 슬라이스 0 — C05.** FR-103 개정 · **해설 `timeframe` 주입 구현**(그동안 LLM 이 쓴 기간을 검사만 하고 통과시켰다 — 이제 버리고 `COACH_HORIZON` 을 넣는다). 기간 = 채점 기간(`SRV-REQ-025` FR-56) |
| 2026-09-24 | **F009 슬라이스 0 — C06.** FR-172 신설 · 구현. 저장소가 출처로 거른다(`PrismaSymbolJudgmentStore` 생성자 인자, 조립은 `composition.ts`) |
| 2026-09-28 | **F010 슬라이스 0 — 성적표 신뢰성.** FR-173~176 신설 · 구현. **지표가 한 번도 계산되지 않던 버그**(캔들 `5m` · `1d` 를 지표 이름 `m5` · `h1` 로 조회 → `technical_indicators` 0행) 수정이 포함된다 — 그동안 라이브 판단 전부가 지표 결측 감점을 받았다. FR-32 기본안 폐기. 근거 `reports/checklists/SRV-REQ-024.md` §9 · `requirements/specs/in-progress/F010-slice0-scorecard-integrity-slice.md` |
| 2026-09-29 | **F010 슬라이스 1 — 예측 원장 + 규칙 IC.** FR-177 · 178 신설 · 구현. 대형 체결이 화면 호출 때만 저장되던 것을 워커 수집으로(4개월 15종목 291행이었다) · 매일 불변 원장. 규칙 IC 결과(단타 총점 반대 · 장기 총점 유지 · 고래 · 공포탐욕 가중 0)는 `salt-forecast` `FC-REQ-008` — **가중 변경은 이 REQ 에 아직 없다**(사용자 결정 대기). 근거 `reports/checklists/SRV-REQ-024.md` §10 · `requirements/specs/in-progress/F010-slice1-prediction-ledger-slice.md` |
| 2026-09-29 | **FR-179 신설 · 구현 — `mode-decision@2`**(사용자 결정 "베스트 케이스로"). 성적표가 v2 표본만 세므로 판단 블록은 v2 표본 20 이 쌓일 때까지 `insufficient_sample`(단타 약 20일 · 장기 20 × 30일 관찰). 근거 `reports/checklists/SRV-REQ-024.md` §11 |
| 2026-09-30 | **F010 슬라이스 6 — 거래소 투자유의.** FR-191~193 신설 · 구현. 새 판정 막힘 사유 `exchange_warning`(소비처 유니온에 추가 필요 — BFF-REQ-039 · FE), 응답 `exchangeFlag`. DVOL(`dvol-sigma@1`)은 채택 없음이라 목표 비중 σ 무변경. 근거 `reports/checklists/SRV-REQ-024.md` §15 |
| 2026-09-29 | **target-weight@2 — 알트 규칙 밖 · 라이브 원장.** FR-187~190 신설 · 구현(`05a52f3`, BREAKING: 보유 알트가 `rows` 에서 빠지고 `excluded.reason = no_record`, `status` 에 `no_room`). 근거 `reports/checklists/SRV-REQ-024.md` §14 |
| 2026-09-29 | **F010 슬라이스 5 — 목표 비중 안내(확률 없음).** FR-182~186 신설 · 구현. 새 경로 `GET /api/coach/target-weights` · `PUT /api/coach/risk-budget` 에 `investableCapital`. σ 를 게이트 없는 EWMA 로 읽는 `SymbolRisk.ewma` 추가(FR-183). 과거 성적은 사전등록 `target-weight@1` 리포트 상수. 근거 `reports/checklists/SRV-REQ-024.md` §13 |
