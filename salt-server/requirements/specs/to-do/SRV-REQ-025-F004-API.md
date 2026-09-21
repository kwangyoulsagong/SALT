---
id: SRV-REQ-025
feature: F004
area: srv
kind: API
title: "F004 AI 코치 추천 — REST 계약 정의 (기존 5경로 확장 · 렌더 게이트 필드)"
priority: critical
labels: [api, rest, contract, coach, render-gate]
created: 2026-09-09
---

## Summary

**기존 경로를 유지하고 필드를 추가**한다. F004는 새 엔드포인트가 적고, 대신 **렌더 게이트 필드**(`renderable`·`blockedReason`)와 **3종 세트**(`signalTrackRecord`·`failureCases`)를 응답에 추가하는 것이 핵심이다.

## 엔드포인트

### 기존 (필드 추가)

| Method | Path | 추가 필드 |
|---|---|---|
| GET | `/api/ai-coach` (`?symbol&mode&preview`) | `renderable` · `blockedReason` · `signalTrackRecord` · `failureCases` · `scoreNote` · `excluded[]` · `staleHours`. **종목 경로(`symbol` 있음)는 2026-09-21 절의 `SymbolCoachResult`** — 모드별 게이트 · `zone` · `gaugeTrackRecords` · `validity`, **`confidence` 제거** |
| POST | `/api/ai-coach/generate` | **쿨다운 429** + `retryAfterSeconds` |
| GET/PATCH | `/api/ai-coach/profile` | `defaultMode`·`notificationLevel` **실제 영속화**(`unsupportedPersistedFields` 제거) |
| POST | `/api/ai-coach/feedback` | `reasonCode` 4종 |
| POST | `/api/ai-coach/explain` | **인증 추가**(현재 public + TODO 주석) + rate limit. 2026-09-21: 3종 동봉 · `newsSummary` ≤ 5 · 예상 수익 없음 · 판단 미렌더면 생성 안 함 |
| GET | `/api/profit-plan` | `distanceFromCurrentPct` · 3자산군 지원 |
| GET | `/api/signal-performance` | `?groupBy=signalType` · `lowSample` · 2026-09-21: `returnDistribution`(30일, B17) |
| POST | `/api/trade-preflight` | ~~변경 없음~~ **개정 2026-09-21 (B1)**: 요청 `stopLossRate?` · 응답 `maxLossOfTotalRate` 추가. **게이트 · 차단 · 주문 필드 추가 금지는 그대로** |
| GET | `/api/behavior-coach` | `factCode` + `params` 추가 (기존 필드 유지) |

### 신규

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/coach/detail` | 코치 상세 조립 (추천 + 성적표 + 실패이력 + 익절 + 행동기록 + 후보) |
| GET | `/api/coach/scoreboard` | 신호 유형별 성적표 표 |
| GET | `/api/coach/generation-status` | 마지막 생성 시각 · 쿨다운 남은 시간 |

## 응답 계약

```ts
type CoachDetailResult = {
  generatedAt: string | null;
  staleHours: number | null;
  regime: string | null;                  // market.regime

  recommendation: {
    action: 'buy' | 'sell' | 'hold' | 'rebalance';
    symbol: string;
    assetType: 'crypto' | 'us_stock';     // kr_stock 은 제외된다
    score: number;                        // 0~100
    scoreNote: string;                    // "점수는 확률이 아닙니다"

    renderable: boolean;                  // 3종 세트 게이트 결과
    blockedReason: 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing' | null;

    reasons: Array<{ type: string; message: string; value?: number | string | null }>;
    topFactors: Array<{ key: string; score: number; message: string }>;

    signalTrackRecord: {
      signalType: string; sample: number; winRate: number;
      avgReturn: number; maxDrawdown: number; lowSample: boolean;
    } | null;

    failureCases: Array<{ date: string; event: string; outcome: string }>;

    explanation: { text: string; source: 'llm' | 'rule' };
  } | null;

  risks: Array<{ type: string; symbol?: string; message: string; severity: number }>;
  candidates: Array<{ action: string; symbol: string; score: number; reasons: string[] }>;   // 상위 3

  exitPlans: Array<{
    symbol: string; assetType: string; currentPrice: number;
    stopLoss: { price: number; distancePct: number };
    firstTakeProfit: { price: number; distancePct: number };
    trendHold: { conditionCode: string };
  }>;

  behaviorFacts: Array<{ factCode: string; params: Record<string, string | number>; amountKrw: number | null }>;

  excluded: Array<{ assetType: 'kr_stock'; reasonCode: string }>;
  disclaimer: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`renderable`과 `blockedReason`을 항상 포함**한다. 화면이 게이트를 우회할 수 없게 | Must |
| FR-2 | `renderable: false`여도 **200**이다. 에러가 아니다 | Must |
| FR-3 | `signalTrackRecord`가 `null`일 수 있다. 그 경우 `renderable: false`다 | Must |
| FR-4 | `failureCases`가 빈 배열일 수 있다. 그 경우 `renderable: false`다 | Must |
| FR-5 | **`scoreNote`를 항상 포함**한다 | Must |
| FR-6 | **`disclaimer`를 항상 포함**한다 | Must |
| FR-7 | `excluded[]`에 `kr_stock` 제외 사실을 담는다 | Must |
| FR-8 | `behaviorFacts`는 **`factCode` + `params`** 다. **완성된 문장을 주지 않는다** | Must |
| FR-9 | `trendHold.conditionCode`는 코드다. 문구는 프론트 | Must |
| FR-10 | `POST /api/ai-coach/generate`가 쿨다운 중이면 **429 + `retryAfterSeconds`** | Must |
| FR-11 | `POST /api/ai-coach/explain`에 **인증을 추가**한다. 현재 public이고 `TODO: add rate-limit + auth` 주석이 있다 | Must |
| FR-12 | `explain`에 rate limit을 둔다. LLM 호출이 비용이다 | Must |
| FR-13 | `profile`의 `defaultMode`·`notificationLevel`이 **실제 영속화**된다. `unsupportedPersistedFields`를 제거한다 | Must |
| FR-14 | `POST /api/trade-preflight`에 **게이트·차단 필드를 추가하지 않는다.** 계산 표시 전용 | Must |
| FR-15 | `GET /api/signal-performance?groupBy=signalType`을 추가한다. 기존 무인자 호출은 **하위 호환** | Must |
| FR-16 | `GET /api/profit-plan`에 `distanceFromCurrentPct`를 추가한다. 기존 필드를 제거하지 않는다 | Must |
| FR-17 | `GET /api/behavior-coach`에 `factCode`·`params`를 **추가**한다. 기존 응답을 유지한다 | Must |
| FR-18 | `staleHours`를 계산해 담는다. 화면이 `생성 후 27시간 경과` 배지를 만든다 | Must |
| FR-19 | 금액은 원 단위 정수 | Must |
| FR-20 | Swagger를 갱신한다. **`explain`의 public 표시를 제거**한다 | Must |

## 종목 판단 계약 — 우측 AI 코치 패널 · 상세 분석 페이지 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · B1 · B3 · B9 · B10 · B17 · B18.
경로는 **기존 `GET /api/ai-coach?symbol&mode`** 를 쓴다(`GetCoachRecommendation` 이 `symbol` 유무로 분기 — 기존 동작).
BFF `/api/app/ai-coach/preview` · `/detail` 이 이미 이 경로를 부른다.

```ts
type ModeJudgment = {
  action: 'review_short_opportunity' | 'review_accumulation' | 'wait' | 'avoid';
  label: string;                 // 서버 중립 라벨 (FR-101 of SRV-REQ-024)
  score: number;                 // 0~100
  scoreNote: string;             // "점수는 확률이 아닙니다"
  validity: { code: 'scalp_5m_24h' | 'long_term_1w_1y' };   // 유효시간 — 서버 단일 표기
  riskLevel: 'medium' | 'high';
  headline: string;
  reasons: string[];
  risks: string[];
  // confidence — 없다 (D3)
};

type Zone =
  | { kind: 'held_rule'; notPrediction: true; currentPrice: number;
      stages: Array<{ key: 'protect_loss' | 'first_profit' | 'trend_hold'; price: number; distancePct: number; ratio: number }>;
      status: 'take_profit_review' | 'stop_loss_review' | 'raise_stop_review' | 'hold_plan' }
  | { kind: 'observation'; notPrediction: true; currentPrice: number;
      lower: number; mid: number; upper: number;
      distancePct: { lower: number; mid: number; upper: number };
      ruleCode: string; lookback: { timeframe: 'm5' | 'd1'; days: number }; sample: number }
  | { kind: 'unavailable'; reasonCode: 'scope_undecided' | 'excluded_asset' | 'insufficient_price_history' };

type ModeCoachView = {
  judgment: ModeJudgment;
  renderable: boolean;
  blockedReason: 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing' | null;
  trackRecord: { signalType: string; sample: number; winRate: number | null; avgReturn: number | null;
                 maxDrawdown: number | null; lowSample: boolean } | null;
  failureCases: Array<{ date: string; event: string; outcome: string }>;
  zone: Zone;
};

type SymbolCoachResult = {
  symbol: string;
  assetType: 'crypto' | 'us_stock' | 'kr_stock';
  mode: 'scalp' | 'long_term';            // 요청 모드 (없으면 profile.defaultMode → scalp)
  modes: { scalp: ModeCoachView; longTerm: ModeCoachView };
  gaugeTrackRecords: Array<{
    gauge: 'sentiment' | 'smart_money'; bucketCode: string; currentValue: number;
    horizonDays: 30; sample: number; p25: number | null; median: number | null; p75: number | null;
    positiveRate: number | null; lowSample: boolean;
  }>;
  riskGuard: { hasHolding: boolean; holdingWeightLimit: number; currentValue: number; unrealizedProfitRate: number | null };
  evidence: { /* 기존 그대로 — price · change24h · sentiment · technical · whale */ };
  missingData: string[];
  dataFreshness: { /* 기존 그대로 */ };
  disclaimer: string;
  // 하위 호환: headline · modeDecision · dualDecision 은 당분간 유지하되 confidence 를 뺀다
};
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 종목 경로 응답에 **`modes.scalp` · `modes.longTerm` 을 항상** 싣는다. 요청 `mode` 는 기본 선택일 뿐이다 | Must |
| FR-41 | **`confidence` 를 응답에서 뺀다** — `modes.*` 에 없고, 하위 호환으로 남기는 `modeDecision` · `dualDecision` 에서도 뺀다(D3). 이것은 **필드 제거**이므로 FR-30 의 예외다 — BFF `mapDecision` 이 `confidence` 를 옮기고 있어 BFF 와 동시 변경이다(`BFF-REQ-025`) | Must |
| FR-42 | 모드마다 `renderable` · `blockedReason` 을 **항상** 싣는다. `renderable: false` 도 200 | Must |
| FR-43 | `trackRecord` 는 표본 0 이면 `{ sample: 0, winRate: null, ... }` 이고, 매핑 자체가 없으면 `null` 이다. 둘을 구분한다(SRV-REQ-024 FR-132) | Must |
| FR-44 | `zone` 은 판별 union 이다. `held_rule` 의 `stages` 는 3개 고정, `observation` 은 `lower ≤ mid ≤ upper`. **수익률 · 목표가 · 확률 필드 0건** | Must |
| FR-45 | `validity.code` 가 유효시간의 유일한 출처다. 사람이 읽는 문구는 프론트 i18n | Must |
| FR-46 | `gaugeTrackRecords` 는 표본 0 인 게이지를 **넣지 않는다**(배열에서 빠진다). 1 이상 20 미만은 `lowSample: true` | Must |
| FR-47 | `disclaimer` 를 항상 싣는다 | Must |
| FR-48 | `mode` 가 없으면 `UserInvestmentProfile.defaultMode` → 없으면 `scalp`(B16). 기존 코드는 `query.mode ?? "scalp"` 다 — 프로필을 먼저 본다 | Must |
| FR-49 | `preview=true` 는 같은 모양에서 `zone` · `gaugeTrackRecords` 를 생략할 수 있다(홈 요약). **게이트 필드는 생략하지 않는다** | Must |

### 즉석 해설 · 주문 전 체크 · 성적표 분포

```ts
// POST /api/ai-coach/explain — 응답 (B3)
type ExplainResult =
  | { renderable: true; modeReasoning: string; validity: { code: string }; keyDrivers: string[]; risks: string[];
      newsSummary: string[];          // 최대 5
      trackRecord: ModeCoachView['trackRecord']; failureCases: ModeCoachView['failureCases'];
      disclaimer: string; generatedAt: string; cached: boolean; source: 'llm' | 'rule' }
  | { renderable: false; blockedReason: string };           // LLM 을 부르지 않았다

// POST /api/trade-preflight — 추가 (B1)
// 요청: stopLossRate?: number   (칩 −1.5 ~ −12%; stopPrice 가 있으면 stopPrice 우선)
//       takeProfitPrices 는 선택 — 서버가 채우지 않는다
// 응답: maxLossOfTotalRate: number | null

// GET /api/signal-performance?groupBy=signalType — 그룹마다 추가 (B17)
// returnDistribution: { horizonDays: 30; buckets: Array<{ code: string; count: number }>; p25: number | null; median: number | null; p75: number | null }
// hits: Array<{ date; event; outcome }> · misses: Array<{ date; event; outcome }>   // 같은 구조 · 같은 상한 3 (B2)
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `explain` 은 요청 종목 · 모드의 판단이 `renderable: false` 면 **LLM 을 부르지 않고** `{ renderable: false, blockedReason }` 을 200 으로 준다 | Must |
| FR-51 | `explain` 응답에 `expectedReturn` 류 필드 0건(2026-09-18 제거 유지). `newsSummary` 최대 5 | Must |
| FR-52 | `trade-preflight` 에 `stopLossRate` 입력 · `maxLossOfTotalRate` 출력을 추가한다. **목표가 기본값을 서버가 만들지 않는다.** 주문 · 외부 링크 필드 0건 | Must |
| FR-53 | `signal-performance?groupBy=signalType` 그룹에 `returnDistribution` · `hits` · `misses` 를 추가한다. 무인자 호출은 하위 호환 | Must |
| FR-54 | 관심 종목 응답(`/api/watchlist`)에 판단 · 신호 필드를 추가하지 않는다(D4) | Must |

## 하위 호환

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 기존 5경로의 응답에 **필드 추가만** 한다. 제거·이름 변경 0건. **개정 2026-09-21**: 예외 1건 — 종목 경로의 `confidence` 제거(FR-41, D3). BFF 와 동시 변경 | Must |
| FR-31 | 프론트가 아직 없는 경로이므로 **파괴적 변경이 안전하지만**, BFF가 이미 프록시하고 있으므로 계약 테스트를 둔다 | Must |
| FR-32 | `explain`에 인증을 추가하면 **BFF 프록시가 토큰을 전달해야 한다.** BFF 변경이 짝이다 | Must |

## Acceptance Criteria

- [ ] 신규 3경로가 등록되고 기존 9경로가 확장된다
- [ ] **`renderable`·`blockedReason`이 모든 추천 응답에 있다**
- [ ] `renderable: false`가 200이다
- [ ] `signalTrackRecord`를 null로 만들면 `renderable: false`이고 `blockedReason: 'signal_track_record_missing'`이다
- [ ] `failureCases`를 빈 배열로 만들면 `renderable: false`다
- [ ] `scoreNote`·`disclaimer`가 항상 있다
- [ ] `excluded[]`에 `kr_stock`이 있다
- [ ] `behaviorFacts`가 `factCode` + `params`이고 **완성 문장이 0건이다**
- [ ] `trendHold.conditionCode`가 코드다
- [ ] **5분 내 재생성이 429 + `retryAfterSeconds`다**
- [ ] **`POST /api/ai-coach/explain`이 인증을 요구한다**
- [ ] `explain`에 rate limit이 있다
- [ ] `profile`의 `defaultMode`·`notificationLevel`이 영속화되고 `unsupportedPersistedFields`가 0건이다
- [ ] `trade-preflight`에 게이트·차단 필드가 0건이다
- [ ] `signal-performance?groupBy=signalType`이 동작하고 무인자 호출이 하위 호환이다
- [ ] `profit-plan`에 `distanceFromCurrentPct`가 있고 기존 필드가 유지된다
- [ ] `behavior-coach`에 `factCode`·`params`가 추가되고 기존 응답이 유지된다
- [ ] `staleHours`가 계산된다
- [ ] 금액이 전부 정수다
- [ ] Swagger에서 `explain`의 public 표시가 제거되었다
- [ ] 기존 경로 응답 스냅샷이 하위 호환이다 (`confidence` 제거 1건 제외)
- [ ] 종목 경로가 `modes.scalp` · `modes.longTerm` 을 항상 싣는다
- [ ] **종목 경로 응답 전체에서 `confidence` 가 0건이다** (`modes` · `modeDecision` · `dualDecision`)
- [ ] 모드별 `renderable` · `blockedReason` 이 항상 있다
- [ ] `trackRecord` 표본 0 과 매핑 없음(`null`)이 구분된다
- [ ] `zone` 이 판별 union 이고 수익률 · 목표가 · 확률 필드가 0건이다
- [ ] `mode` 없는 요청이 `defaultMode` 를 따른다
- [ ] `preview=true` 에서도 게이트 필드가 있다
- [ ] `explain` 이 판단 미렌더 시 LLM 호출 0건 · 200 이다
- [ ] `explain` 에 `newsSummary` ≤ 5 가 있고 예상 수익 필드가 0건이다
- [ ] preflight 에 `stopLossRate` · `maxLossOfTotalRate` 가 있고 목표가 서버 기본값이 0건이다
- [ ] 성적표 그룹에 `returnDistribution` · `hits` · `misses` 가 있다
- [ ] 관심 종목 응답에 판단 필드가 0건이다

## Dependencies

- **선행:** `SRV-REQ-024`(도메인) · `DB-REQ-017`~`020`
- **짝:** `BFF-REQ-025`(F004 UPSTREAM)가 `explain` 인증 전달을 담당
- **규칙:** `ddd-presentation.md` · `api-contract.md`

## Open Questions

- `GET /api/coach/detail`을 새로 만들지 기존 `/api/ai-coach`를 확장할지. **새로 만드는 것이 깨끗하지만** BFF가 이미 `/api/ai-coach`를 부르고 있다 → **기존 확장 + 신규 병행**이 기본안.
- `explain`에 인증을 추가하면 **PM 프로토타입이 깨진다**(현재 public으로 데모용). 프로토타입을 어떻게 할지 결정 필요.
- `staleHours` 임계(24h)와 워커 생성 주기의 정합. 워커가 6시간마다 생성하면 `staleHours`가 24를 넘지 않는다.
- `modeDecision` · `dualDecision`(하위 호환 필드)을 언제 걷을지. BFF 가 `modes` 로 옮긴 뒤 한 릴리스 후가 기본안.
- **Q3** — 미보유 주식 관찰 구간(`zone.kind = unavailable(scope_undecided)` 가 결정 전 값).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 신규 FR-40~54 · `SymbolCoachResult` 계약(모드별 3종 게이트(B10) · `zone`(D2) · `gaugeTrackRecords`(B9) · `validity` · **`confidence` 제거**(D3)), `explain` 3종 동봉 · 뉴스 5줄 · 미렌더 시 LLM 미호출(B3), preflight `stopLossRate`/`maxLossOfTotalRate`(B1), 성적표 분포 · 적중/실패 동등(B17 · B2), 관심 종목 판단 필드 금지(D4). 개정: FR-30(`confidence` 제거 예외), 엔드포인트 표 preflight 행 |
