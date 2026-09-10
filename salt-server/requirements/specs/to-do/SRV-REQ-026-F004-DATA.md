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
│   └── api/{BiasLabelQuery, BiasLabelView, RecommendationQuery, RecommendationView}
├── infrastructure/
│   ├── PrismaRecommendationStore · PrismaFeedbackStore · PrismaGenerationLogStore
│   ├── PrismaSignalPerformanceProjection · IndicatorTrackAdapter(indicator ACL)
│   ├── HoldingAdapter(portfolio ACL) · TransactionAdapter(ledger ACL) · IndicatorAdapter(indicator ACL)
│   ├── GeminiExplainerClient · RuleExplainer
│   └── mappers/
└── presentation/    coach.routes · ai-coach.routes(기존 경로 유지) · controller · dto/
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 기존 5개 모듈(`ai-coach`·`signal-performance`·`profit-plan`·`trade-preflight`·`behavior-coach`)을 `coach`로 통합한다 | Must |
| FR-2 | `domain`이 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |
| FR-3 | `coach`가 `portfolio`·`ledger`·`indicator`를 **ACL로만** 부른다 | Must |
| FR-4 | **`coach/application/api`로 `BiasLabelQuery`를 공개**한다. F001의 `invoice`가 소비한다 | Must |
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
| `TransactionAdapter` | `ledger/application/api` | `TransactionSource` — 행동 분석 입력 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | ACL 이름에 컨텍스트를 쓰지 않고 **무엇을 가져오는지**를 쓴다 | Must |
| FR-41 | `indicator`를 두 번 감싸므로 이름이 겹칠 수 있다. **`IndicatorTrackAdapter`(실패이력)와 `IndicatorAdapter`(스냅샷)로 구분**한다 | Must |
| FR-42 | ACL이 없으면 상대 컨텍스트의 모양이 우리 유스케이스로 새어 들어온다 | Must |

## 워커

| 워커 | 주기 | 하는 일 | 멱등 |
|---|---|---|---|
| `investment-insight.worker` | **기존 주기 유지** | 추천 생성 | `@@unique([userId, type, dedupeKey])` upsert |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 기존 워커를 유지하고 **`application/GenerateRecommendation`을 부르게** 바꾼다. 워커가 직접 계산하지 않는다 | Must |
| FR-51 | 워커 생성은 **쿨다운 대상이 아니다** | Must |
| FR-52 | 생성 결과를 `CoachGenerationLog`에 `source: 'worker'`로 남긴다 | Must |
| FR-53 | `assetType`을 3자산군으로 확장한다. 단 **`kr_stock`은 추천 생성 대상이 아니다** | Must |
| FR-54 | **LLM을 부르므로 다른 워커와 같은 큐에 넣지 않는다.** 수십 초를 잡으면 뒤의 작업이 밀린다 | Must |
| FR-55 | 실패는 지수 백오프 2회. 최종 실패 시 **마지막 insight를 유지**하고 로그에 남긴다 | Must |
| FR-56 | 워커 주기와 `staleHours` 임계(24h)의 정합을 확인한다 | Must |

## 매핑

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `payload`에서 승격된 컬럼(`kind`·`action`·`score`·`signalType`·`generatedAt`)을 읽는다. **JSON을 다시 파싱하지 않는다** | Must |
| FR-61 | `payload`는 표시용 필드(`reasons`·`risks`·`candidates`·`topCandidateFactors`·`explanation`)만 읽는다 | Must |
| FR-62 | `Float` 컬럼(`profit-plan` 입력인 `PortfolioHolding.*`)을 읽을 때 `Decimal`로 승격한다 | Must |

## Acceptance Criteria

- [ ] `coach` 컨텍스트가 5개 모듈을 통합하고 4층 구조다
- [ ] `grep -rn "@prisma/client\|express\|axios" src/coach/domain` = 0
- [ ] `coach`가 `portfolio`·`ledger`·`indicator`를 ACL로만 부른다
- [ ] **`coach/application/api`에 `BiasLabelQuery`가 있다**
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
- [ ] ACL 4개 이름에 컨텍스트 이름이 0건이고 서로 구분된다
- [ ] 워커가 `application` 유스케이스를 부른다
- [ ] 워커 생성이 쿨다운 대상이 아니다
- [ ] 워커 생성이 `CoachGenerationLog`에 남는다
- [ ] `kr_stock` 추천 생성이 0건이다
- [ ] **LLM 워커가 다른 워커와 다른 큐에 있다**
- [ ] 워커 실패가 지수 백오프 2회 후 마지막 insight를 유지한다
- [ ] 워커 주기와 `staleHours` 임계가 정합한다
- [ ] 승격된 컬럼을 읽고 JSON 재파싱이 0건이다
- [ ] `Float` 입력이 `Decimal`로 승격된다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-024`(도메인) · `DB-REQ-017`~`020` · `SRV-REQ-022`(F003 `indicator` 컨텍스트)
- **공개 소비:** F001의 `invoice`가 `BiasLabelQuery`를 쓴다
- **규칙:** `ddd-infrastructure.md` · `workers-external.md` · `performance-server.md`

## Open Questions

- `investment-insight/`의 12개 서비스 배치(`SRV-REQ-006` Open Question). `market-regime`·`news-analysis`·`whale-signal`을 `market`으로 옮기면 `coach`가 그것들을 ACL로 불러야 한다 — **ACL이 4개에서 7개로 늘어난다.** 그 비용이 적절한지 판단 필요.
- `entry` 조회를 범위 1회로 합칠 수 있는가(`DB-REQ-020` Open Question).
- 워커 주기가 현재 얼마인지 확인 필요. `staleHours` 24h 임계와 맞아야 한다.
- `explain`의 5분 캐시를 인메모리로 둘지. 사용자 ≤10명이면 충분하다.
