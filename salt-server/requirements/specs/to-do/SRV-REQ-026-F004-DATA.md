---
id: SRV-REQ-026
feature: F004
area: srv
kind: DATA
title: "F004 AI 코치 추천 — 컨텍스트·워커·LLM 연동 정의"
priority: critical
labels: [ddd, infrastructure, worker, llm, gemini, projection]
created: 2026-09-09
---

## Summary

`coach` 컨텍스트의 구조. **기존 5개 모듈을 통합**하고, LLM 클라이언트를 격리하고, 성적표 N+1을 Projection으로 제거한다.

## 컨텍스트 구조

```
src/coach/
├── domain/
│   ├── Recommendation · SignalTrackRecord VO · ExitPlan VO · PreflightResult VO
│   ├── RecommendationStore · FeedbackStore · GenerationLogStore
│   ├── SignalPerformanceProjection(Port) · IndicatorTrackSource(Port)
│   ├── HoldingSource(Port) · TransactionSource(Port) · IndicatorSource(Port) · ExplainerPort
│   └── policy/{renderGate,recommendationScope,score,signalPerformance,exitPlan,preflight,behaviorFact}
├── application/
│   ├── GenerateRecommendation · GetCoachDetail · GetScoreboard
│   ├── SubmitFeedback · UpdateCoachProfile · RunPreflight · GetGenerationStatus
│   └── api/{RecommendationQuery, RecommendationView}      # BiasLabelQuery 는 ADR-002 로 삭제
├── infrastructure/
│   ├── PrismaRecommendationStore · PrismaFeedbackStore · PrismaGenerationLogStore
│   ├── PrismaSignalPerformanceProjection · IndicatorTrackAdapter(indicator ACL)
│   ├── HoldingAdapter(portfolio ACL) · TransactionAdapter(portfolio ACL — PortfolioTransaction) · IndicatorAdapter(indicator ACL)
│   ├── GeminiExplainerClient · RuleExplainer
│   └── mappers/
└── presentation/    coach.routes · ai-coach.routes(기존 경로 유지) · controller · dto/
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 기존 5개 모듈(`ai-coach`·`signal-performance`·`profit-plan`·`trade-preflight`·`behavior-coach`)을 `coach`로 통합한다 | Must |
| FR-2 | `domain`이 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |
| FR-3 | `coach`가 `portfolio`·`indicator`를 **ACL로만** 부른다. **개정 2026-09-21**: `ledger` 컨텍스트는 만들지 않는다(ADR-002) — 거래 입력은 `portfolio` 의 기존 `PortfolioTransaction` 이다 | Must |
| FR-4 | ~~`coach/application/api`로 `BiasLabelQuery`를 공개한다. F001의 `invoice`가 소비한다~~ **개정 2026-09-21 (ADR-002)**: 소비처 삭제로 공개하지 않는다 | — |
| FR-5 | **기존 HTTP 경로를 유지한다**(`/api/ai-coach`·`/api/profit-plan`·`/api/signal-performance`·`/api/trade-preflight`·`/api/behavior-coach`) | Must |
| FR-6 | `infrastructure/index.ts`가 Store 클래스를 export하지 않는다 | Must |

## LLM 연동 — 격리와 폴백

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `ExplainerPort`를 `domain`에 선언한다. 구현이 `GeminiExplainerClient`와 `RuleExplainer` 둘이다 | Must |
| FR-11 | **LLM 실패 시 `RuleExplainer`로 폴백**한다. `application`이 두 구현을 순서대로 시도한다 | Must |
| FR-12 | `Port` 시그니처에 **Gemini 타입이 노출되지 않는다.** 노출되면 그 Port는 이미 어댑터다 | Must |
| FR-13 | **프롬프트에 숫자를 주입**한다. LLM이 계산하지 않는다 | Must |
| FR-14 | **프롬프트·응답을 원문 로깅하지 않는다.** `CoachGenerationLog`에 `llmSource`·`durationMs`·`errorCode`만 | Must |
| FR-15 | 프롬프트에 **계좌 식별자·거래소 키를 넣지 않는다** | Must |
| FR-16 | **후처리 검사**: 확신 표현("확실"·"무조건"·"보장"·"100%")과 목표주가 표현이 응답에 있으면 **규칙 문장으로 대체**한다 | Must |
| FR-17 | LLM 호출은 **트랜잭션 밖**이다. Port 주석에 명시한다 | Must |
| FR-18 | 타임아웃과 재시도 상한(지수 백오프 2회)을 둔다. LLM은 수 초~수십 초다 | Must |
| FR-19 | 해설을 **생성 시 1회** 만들어 `InvestmentInsight.payload.explanation`에 저장한다. 매 요청마다 부르지 않는다 | Must |
| FR-20 | `explain` 엔드포인트(즉석 해설)는 **5분 캐시**를 유지한다(기존 동작) + rate limit | Must |

## Projection — 성적표 N+1 제거

현재 `signal-performance.service`가 insight 100건마다 `PriceHistory`를 2회 조회한다(**200 쿼리**).

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `SignalPerformanceProjection`을 `domain` Port로 선언하고 `infrastructure`가 구현한다 | Must |
| FR-31 | insight의 심볼을 모아 **`PriceHistory`를 심볼별 1회** 조회한다 | Must |
| FR-32 | 심볼별 최신가(`latest`)는 **심볼당 1회**다 | Must |
| FR-33 | `entry`(insight 시점 이후 첫 가격)는 **범위 조회 1회**로 여러 insight를 커버한다 | Must |
| FR-34 | **목표: 쿼리 3회 이하.** 개선 전/후 쿼리 수를 측정해 기록한다 | Must |
| FR-35 | `signalType`별 그룹 집계를 **DB에서** 한다 | Must |
| FR-36 | `kind != 'coach_feedback'` 필터를 **컬럼 조건**으로 한다. `payload` JSON 조건 0건 | Must |

## ACL

| ACL | 감싸는 것 | 우리 Port |
|---|---|---|
| `IndicatorTrackAdapter` | `indicator/application/api` (`IndicatorTrackQuery`) | `IndicatorTrackSource` — 실패사례 |
| `IndicatorAdapter` | `indicator/application/api` (`IndicatorSnapshotQuery`) | `IndicatorSource` — RSI·MVRV 등 |
| `HoldingAdapter` | `portfolio/application/api` | `HoldingSource` — 보유·비중 |
| `TransactionAdapter` | `portfolio/application/api` (기존 `PortfolioTransaction`, **개정 2026-09-21** — `ledger` 없음) | `TransactionSource` — 행동 분석 입력 |
| `PriceDistributionAdapter` (2026-09-21) | `market/application/api` (`PriceHistory`) | `PriceDistributionSource` — 관찰 구간 백분위수 |
| `SentimentHistoryAdapter` (2026-09-21) | `market/application/api` (`MarketSentiment` 이력) | `SentimentHistorySource` — 게이지 적중률 집계 입력 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | ACL 이름에 컨텍스트를 쓰지 않고 **무엇을 가져오는지**를 쓴다 | Must |
| FR-41 | `indicator`를 두 번 감싸므로 이름이 겹칠 수 있다. **`IndicatorTrackAdapter`(실패이력)와 `IndicatorAdapter`(스냅샷)로 구분**한다 | Must |
| FR-42 | ACL이 없으면 상대 컨텍스트의 모양이 우리 유스케이스로 새어 들어온다 | Must |

## 워커

| 워커 | 주기 | 하는 일 | 멱등 |
|---|---|---|---|
| `investment-insight.worker` | **기존 주기 유지** | 추천 생성 | `@@unique([userId, type, dedupeKey])` upsert |
| `symbol-judgment-snapshot` (2026-09-21) | 1시간(기본값) | 추적 자산(≤10 + 보유) × 2모드 판단 + 구간 스냅샷 기록 | `dedupeKey = symbol_judgment:<symbol>:<mode>:<시간 버킷>` |
| `gauge-track-record` (2026-09-21) | 일 1회 | `GaugeTrackRecord` 재집계 | `@@unique([symbol, gauge, bucket, horizonDays])` upsert |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 기존 워커를 유지하고 **`application/GenerateRecommendation`을 부르게** 바꾼다. 워커가 직접 계산하지 않는다 | Must |
| FR-51 | 워커 생성은 **쿨다운 대상이 아니다** | Must |
| FR-52 | 생성 결과를 `CoachGenerationLog`에 `source: 'worker'`로 남긴다 | Must |
| FR-53 | `assetType`을 3자산군으로 확장한다. 단 **`kr_stock`은 추천 생성 대상이 아니다** | Must |
| FR-54 | **LLM을 부르므로 다른 워커와 같은 큐에 넣지 않는다.** 수십 초를 잡으면 뒤의 작업이 밀린다 | Must |
| FR-55 | 실패는 지수 백오프 2회. 최종 실패 시 **마지막 insight를 유지**하고 로그에 남긴다 | Must |
| FR-56 | 워커 주기와 `staleHours` 임계(24h)의 정합을 확인한다 | Must |

## 종목 판단 · 바이존 · 게이지 적중률 연동 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · D8 · B3 · B9 · B18.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 도메인에 `policy/observationZone.ts`(순수 함수: 백분위 결과 → `Zone`) · `policy/gaugeTrackRecord.ts`(구간 분류 · 30일 수익률 분포 요약)를 둔다. **입력은 숫자, Prisma 타입 0건** | Must |
| FR-71 | 백분위수 계산은 **DB 에서**(`percentile_cont`) 하고 어댑터가 결과 3개만 올린다. 도메인은 경계 검증(`lower ≤ mid ≤ upper`)과 `unavailable` 판정만 한다 | Must |
| FR-72 | `GetSymbolCoach` 가 두 모드 × (판단 · 게이트 · 성적표 · 실패 이력 · 구간)과 게이지 적중률을 **병렬**로 조립한다. 하나가 실패하면 그 필드만 비고(`zone.kind = unavailable` · 게이지 항목 제외), **판단 게이트는 실패 쪽으로 닫힌다**(성적표 · 실패 이력 조회 실패 → `renderable: false`) | Must |
| FR-73 | **`CoachExplanationInput.confidence` 를 지운다(D3).** 프롬프트에 신뢰도를 주입하지 않는다. `validity.code` 를 주입하고 `CoachExplanation.timeframe` 은 그 값을 그대로 돌려준다 — LLM 이 기간을 만들지 않는다 | Must |
| FR-74 | 해설 요청 전에 판단 게이트를 먼저 본다. `renderable: false` 면 `CoachExplainer` 를 부르지 않는다(B3 · `SRV-REQ-025` FR-50) | Must |
| FR-75 | `newsSummary` 는 입력 기사(`NewsProbe`)만 요약하고 **최대 5줄**로 자른다. 후처리 검사(FR-16)를 `newsSummary` 에도 건다 | Must |
| FR-76 | **`symbol-judgment-snapshot` 워커**: 추적 자산 목록(D8 — 사용자당 최대 10, 보유 종목은 상한과 무관하게 포함)을 읽고 `GetSymbolCoach` 유스케이스를 불러 스냅샷을 남긴다. 워커가 직접 계산하지 않는다(FR-50 원칙) | Must |
| FR-77 | 스냅샷 워커는 **LLM 을 부르지 않는다.** 판단은 규칙 계산이라 초 단위다 — LLM 큐(FR-54)와 분리할 필요가 없지만, 종목 단위로 커밋한다 | Must |
| FR-78 | **`gauge-track-record` 워커**: 종목마다 `MarketSentiment` 이력과 `PriceHistory` 일봉을 범위 조회 각 1회로 읽어 구간별 30일 수익률 분포를 계산하고 upsert 한다. 최근 30일 시점은 표본에서 뺀다 | Must |
| FR-79 | 두 워커는 실패 시 지수 백오프 2회 후 **이전 값을 유지**한다. 스냅샷이 한 시간 비는 것은 표본이 하나 줄 뿐이다 | Must |
| FR-80 | 관심 종목 조회(`watchlist`)가 `coach` 를 부르지 않는다(D4) | Must |

## 매핑

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `payload`에서 승격된 컬럼(`kind`·`action`·`score`·`signalType`·`generatedAt`)을 읽는다. **JSON을 다시 파싱하지 않는다** | Must |
| FR-61 | `payload`는 표시용 필드(`reasons`·`risks`·`candidates`·`topCandidateFactors`·`explanation`)만 읽는다 | Must |
| FR-62 | `Float` 컬럼(`profit-plan` 입력인 `PortfolioHolding.*`)을 읽을 때 `Decimal`로 승격한다 | Must |

## Acceptance Criteria

- [ ] `coach` 컨텍스트가 5개 모듈을 통합하고 4층 구조다
- [ ] `grep -rn "@prisma/client\|express\|axios" src/coach/domain` = 0
- [ ] `coach`가 `portfolio`·`indicator`·`market`을 ACL로만 부르고 `ledger` 참조가 0건이다 (개정 2026-09-21)
- [ ] ~~`coach/application/api`에 `BiasLabelQuery`가 있다~~ (ADR-002 로 무효)
- [ ] **기존 5개 HTTP 경로가 그대로 동작한다** (스냅샷 테스트)
- [ ] `ExplainerPort`에 Gemini 타입이 0건이다
- [ ] LLM 실패 시 `RuleExplainer`로 폴백된다 (실패 주입 3케이스)
- [ ] 프롬프트에 숫자가 주입된다 (LLM 계산 0건)
- [ ] **프롬프트·응답 원문 로깅이 0건이다** (grep)
- [ ] 프롬프트에 계좌 식별자·키가 0건이다
- [ ] **후처리 검사가 확신 표현을 규칙 문장으로 대체한다** (합성 응답 테스트)
- [ ] LLM 호출이 트랜잭션 밖이다
- [ ] LLM 타임아웃·재시도 상한이 있다
- [ ] 해설이 생성 시 1회만 만들어진다 (호출 카운터)
- [ ] `explain`에 5분 캐시 + rate limit이 있다
- [ ] `SignalPerformanceProjection`이 `domain` Port다
- [ ] **성적표 쿼리 수가 200 → 3 이하다** (개선 전/후 측정값 기록)
- [ ] `latest`가 심볼당 1회 조회된다
- [ ] `signalType` 그룹 집계가 DB에서 일어난다
- [ ] **`payload` JSON 조건 쿼리가 0건이다**
- [ ] ACL 6개(2026-09-21 +2) 이름에 컨텍스트 이름이 0건이고 서로 구분된다
- [ ] 워커가 `application` 유스케이스를 부른다
- [ ] 워커 생성이 쿨다운 대상이 아니다
- [ ] 워커 생성이 `CoachGenerationLog`에 남는다
- [ ] `kr_stock` 추천 생성이 0건이다
- [ ] **LLM 워커가 다른 워커와 다른 큐에 있다**
- [ ] 워커 실패가 지수 백오프 2회 후 마지막 insight를 유지한다
- [ ] 워커 주기와 `staleHours` 임계가 정합한다
- [ ] 승격된 컬럼을 읽고 JSON 재파싱이 0건이다
- [ ] `Float` 입력이 `Decimal`로 승격된다
- [ ] `policy/observationZone.ts` · `policy/gaugeTrackRecord.ts` 가 순수 함수이고 Prisma import 가 0건이다
- [ ] 백분위수가 DB 에서 계산된다
- [ ] 종목 판단 조립이 병렬이고 성적표 · 실패 이력 조회 실패가 `renderable: false` 로 닫힌다
- [ ] **`CoachExplanationInput` 에 `confidence` 가 0건이다**
- [ ] 해설 `timeframe` 이 주입값과 같다 (LLM 생성 0건)
- [ ] 판단 미렌더 시 `CoachExplainer` 호출이 0건이다
- [ ] `newsSummary` 가 5줄 이하이고 후처리 검사를 지난다
- [ ] 스냅샷 워커가 유스케이스를 부르고 추적 자산 + 보유 종목을 덮는다
- [ ] 게이지 워커가 종목당 범위 조회 각 1회이고 최근 30일 시점을 뺀다
- [ ] 워커 실패 시 이전 값이 유지된다
- [ ] `watchlist` 가 `coach` 를 부르지 않는다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-024`(도메인) · `DB-REQ-017`~`020` · `SRV-REQ-022`(F003 `indicator` 컨텍스트)
- ~~**공개 소비:** F001의 `invoice`가 `BiasLabelQuery`를 쓴다~~ — ADR-002 로 삭제
- **짝:** 추적 자산 목록(D8)은 `FEATURE-000` 소관 — 스냅샷 워커가 읽기만 한다
- **규칙:** `ddd-infrastructure.md` · `workers-external.md` · `performance-server.md`

## Open Questions

- `investment-insight/`의 12개 서비스 배치(`SRV-REQ-006` Open Question). `market-regime`·`news-analysis`·`whale-signal`을 `market`으로 옮기면 `coach`가 그것들을 ACL로 불러야 한다 — **ACL이 4개에서 7개로 늘어난다.** 그 비용이 적절한지 판단 필요.
- `entry` 조회를 범위 1회로 합칠 수 있는가(`DB-REQ-020` Open Question).
- 워커 주기가 현재 얼마인지 확인 필요. `staleHours` 24h 임계와 맞아야 한다.
- `explain`의 5분 캐시를 인메모리로 둘지. 사용자 ≤10명이면 충분하다.
- `PriceHistory` · `MarketSentiment` 를 `market` 컨텍스트의 `application/api` 로 노출하는 모양. `market` 쪽 REQ 와 이름을 맞춰야 한다.
- 스냅샷 워커 주기(1시간 기본값)와 표본 독립성 — 1시간 간격 스냅샷 30일 뒤 수익률은 서로 겹친다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 신규 FR-70~80(관찰 구간 · 게이지 적중률 도메인 정책, 해설 입력 `confidence` 삭제(D3) · `validity` 주입 · 미렌더 시 LLM 미호출 · 뉴스 5줄(B3), 종목 판단 스냅샷 워커 · 게이지 집계 워커(B9 · B18), 관심 종목 분리(D4)). ACL 2개 추가. 개정: FR-3(`ledger` 없음) · FR-4(`BiasLabelQuery` 무효) · `TransactionAdapter` 가 `portfolio` 를 감싼다 — ADR-002 |
