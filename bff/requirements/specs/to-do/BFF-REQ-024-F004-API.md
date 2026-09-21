---
id: BFF-REQ-024
feature: F004
area: bff
kind: API
title: "F004 AI 코치 추천 — 프론트 대면 계약 정의"
priority: critical
labels: [bff, api, contract, viewmodel, coach, render-gate]
created: 2026-09-09
---

## Summary

코치 화면이 쓰는 뷰모델. **3종 세트 게이트 필드가 계약의 핵심**이고, 화면이 그것을 우회할 수 없어야 한다.

## 엔드포인트

| Method | Path | 용도 | 소비자 |
|---|---|---|---|
| GET | `/api/app/ai-coach/preview` | 홈 요약 (기존) | 홈 블록 |
| GET | `/api/app/ai-coach/detail` | ~~코치 상세 (기존, 필드 추가) — 코치 탭~~ **개정 2026-09-21**: **종목 판단** `?symbol&mode` (기존 코드 그대로) → `SymbolCoachViewModel` | 투자 화면 우측 AI 코치 패널 · 상세 분석 페이지 |
| GET | `/api/app/coach/report` | 코치 리포트 (신규 2026-09-21 — 이전 `/detail` 의 `CoachDetailViewModel`) | 코치 리포트 화면(B15) |
| GET | `/api/app/coach/scoreboard` | 신호 성적표 표 (신규) | 코치 탭 |
| GET | `/api/app/coach/generation-status` | 쿨다운 남은 시간 (신규) | 재생성 버튼 |
| GET/PATCH | `/api/app/ai-coach/profile` | 성향 설정 (기존) | 설정 |
| POST | `/api/app/ai-coach/feedback` | 피드백 (기존, `reasonCode`) | 추천 카드 |
| POST | `/api/app/ai-coach/explain` | 즉석 해설 (기존, **인증 추가**) | 상세 분석 페이지 [해설 보기] |
| POST | `/api/app/ai-coach/generate` | 재생성 (기존, **429**) | 새로 생성 |
| GET | `/api/app/profit-plan` | 익절 플랜 (기존, `distancePct`) | 코치 탭 |
| GET | `/api/app/signal-performance` | 성적표 (기존, `groupBy`) | 코치 탭 |
| POST | `/api/app/trade-preflight` | 주문 전 계산 (기존, 2026-09-21 `stopLossRate` · `maxLossOfTotalRate`) | 상세 분석 페이지 · 코치 리포트 |
| GET | `/api/app/behavior-coach` | 행동 기록 (기존, `factCode`) | 코치 탭 |

## 뷰모델

```ts
// 개정 2026-09-21: 이름은 그대로 두고 경로를 `/api/app/coach/report` 로 옮긴다
type CoachDetailViewModel = {
  asOf: string;
  generatedAt: string | null;
  staleHours: number | null;
  regime: string | null;
  degradedFields: string[];
  status: 'ok' | 'unavailable';

  recommendation: {
    action: 'buy' | 'sell' | 'hold' | 'rebalance';
    symbol: string;
    assetType: 'crypto' | 'us_stock';
    score: number;
    scoreNote: string;

    // ── 3종 세트 게이트 ──
    renderable: boolean;
    blockedReason: 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing' | null;
    reasons: Array<{ type: string; message: string; value?: number | string | null }>;
    topFactors: Array<{ key: string; score: number; message: string }>;
    signalTrackRecord: { signalType: string; sample: number; winRate: number; avgReturn: number; maxDrawdown: number; lowSample: boolean } | null;
    failureCases: Array<{ date: string; event: string; outcome: string }>;
    // ────────────────────

    explanation: { text: string; source: 'llm' | 'rule' };
    feedback: { helpful: boolean; reasonCode: string | null } | null;   // 내가 남긴 피드백
  } | null;

  risks: Array<{ type: string; symbol?: string; message: string; severity: number }>;
  candidates: Array<{ action: string; symbol: string; score: number; reasons: string[] }>;

  exitPlans: Array<{
    symbol: string; assetType: string; currentPrice: number;
    stopLoss: { price: number; distancePct: number };
    firstTakeProfit: { price: number; distancePct: number };
    trendHold: { conditionCode: string };
  }>;

  behaviorFacts: Array<{ factCode: string; params: Record<string, string | number>; amountKrw: number | null }>;   // invoiceLink 제거 (ADR-002)

  excluded: Array<{ assetType: 'kr_stock'; reasonCode: string }>;
  disclaimer: string;
};

type ScoreboardViewModel = {
  groups: Array<{ signalType: string; sample: number; winRate: number; avgReturn: number; maxDrawdown: number; lowSample: boolean;
    // 2026-09-21 (B17 · B2)
    returnDistribution: { horizonDays: 30; buckets: Array<{ code: string; count: number }>; p25: number | null; median: number | null; p75: number | null };
    hits: Array<{ date: string; event: string; outcome: string }>;
    misses: Array<{ date: string; event: string; outcome: string }>;   // hits 와 같은 구조 · 같은 상한
  }>;
  status: 'ok' | 'insufficient_data' | 'unavailable';
};

type GenerationStatusViewModel = {
  lastRequestedAt: string | null;
  cooldownSeconds: number;
  retryAfterSeconds: number;     // 0 이면 즉시 가능
  lastStatus: 'succeeded' | 'failed' | 'cooldown_rejected' | null;
  lastLlmSource: 'llm' | 'rule' | null;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`renderable`·`blockedReason`을 항상 포함**한다. 옵셔널이 아니다 | Must |
| FR-2 | `signalTrackRecord`가 `null`일 수 있고, 그 경우 `renderable: false`다. **두 필드의 정합을 계약으로 보장**한다 | Must |
| FR-3 | `failureCases`가 빈 배열일 수 있고, 그 경우 `renderable: false`다 | Must |
| FR-4 | `renderable: false`가 **200**이다 | Must |
| FR-5 | **`scoreNote`를 항상 포함**한다. 화면이 "점수는 확률이 아닙니다"를 표시할 근거 | Must |
| FR-6 | **`disclaimer`를 항상 포함**한다 | Must |
| FR-7 | `behaviorFacts`는 **`factCode` + `params`** 다. 완성 문장 0건 | Must |
| FR-8 | `trendHold.conditionCode`는 코드다 | Must |
| FR-9 | `excluded[]`에 `kr_stock` 제외가 있다 | Must |
| FR-10 | `feedback`에 **내가 남긴 피드백**을 담는다. 화면이 이미 누른 상태를 표시할 수 있게 | Must |
| FR-11 | `lowSample`을 담는다. 화면이 `표본 부족` 배지 + 승률 회색 처리 | Must |
| FR-12 | 금액은 원 단위 정수 | Must |
| FR-13 | 뷰모델 타입을 `packages/core`로 공유 | Should |
| FR-14 | 기존 5경로의 응답에 **필드 추가만** 한다. 제거·이름 변경 0건 | Must |
| FR-15 | `generate`가 쿨다운 중이면 **429 + `retryAfterSeconds`** | Must |
| FR-16 | `explain`이 **인증을 요구**한다 | Must |
| FR-17 | `trade-preflight` 응답에 **게이트·차단 필드가 없다** | Must |

## 종목 판단 뷰모델 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · D4 · B1 · B3 · B9 · B10 · B16.
서버 `SymbolCoachResult`(`SRV-REQ-025`)를 거의 그대로 싣는다. **패널과 상세 분석 페이지가 같은 뷰모델을 쓴다.**

```ts
enum CoachMode { Scalp = 'scalp', LongTerm = 'long_term' }
enum JudgmentAction { ReviewShortOpportunity = 'review_short_opportunity', ReviewAccumulation = 'review_accumulation', Wait = 'wait', Avoid = 'avoid' }

type ModeCoachViewModel =
  | { renderable: true;
      judgment: { action: JudgmentAction; label: string; score: number; scoreNote: string;
                  validity: { code: string }; riskLevel: 'medium' | 'high'; headline: string; reasons: string[]; risks: string[] };
      trackRecord: { signalType: string; sample: number; winRate: number | null; avgReturn: number | null; maxDrawdown: number | null; lowSample: boolean };
      failureCases: [FailureCase, ...FailureCase[]];
      zone: Zone }
  | { renderable: false;
      blockedReason: 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing';
      trackSample: number | null;            // "표본 N건" 표시용. 매핑 없으면 null
      zone: Zone };                          // 판단이 막혀도 구간은 보인다

type SymbolCoachViewModel = {
  symbol: string;
  assetType: 'crypto' | 'us_stock' | 'kr_stock';
  mode: CoachMode;                            // 초기 선택 (서버가 defaultMode 반영)
  modes: { scalp: ModeCoachViewModel; longTerm: ModeCoachViewModel };
  gaugeTrackRecords: Array<{ gauge: 'sentiment' | 'smart_money'; bucketCode: string; currentValue: number; horizonDays: 30;
                             sample: number; p25: number | null; median: number | null; p75: number | null; positiveRate: number | null; lowSample: boolean }>;
  evidence: { price: number | null; change24h: number | null; sentiment: {...} | null; technical: {...} | null; whale: {...};
              news: Array<{ id: string; title: string; source: string; publishedAt: string }> };
  riskGuard: { hasHolding: boolean; holdingWeightLimit: number };
  preflightDefaults: { symbol: string; entryPrice: number | null; mode: CoachMode };   // 목표가 없음 (B1)
  missingData: string[];
  dataFreshness: { priceUpdatedAt: string | null; sentimentCalculatedAt: string | null; indicatorTimestamp: string | null; generatedAt: string };
  degradedFields: string[];                   // 'news' 등
  disclaimer: string;
  // confidence — 없다 (D3)
};
// Zone 은 SRV-REQ-025 의 판별 union 그대로 (held_rule | observation | unavailable)
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `SymbolCoachViewModel` 을 **`packages/core`** 에 두고 웹 · RN 이 공유한다 | Must |
| FR-31 | **`ModeCoachViewModel` 은 `renderable` 판별 union 이다.** `renderable: false` 에 `judgment` · `trackRecord` 가 **없다** — 막힌 판단의 점수 · 라벨이 화면에 새어 나갈 수 없다. 이것이 Open Question(아래)의 답이다 | Must |
| FR-32 | `confidence` 필드가 타입에 **없다.** 추가하면 리뷰에서 막는다(D3) | Must |
| FR-33 | `zone` 은 판정과 무관하게 싣는다. `notPrediction: true` 가 타입 리터럴이다 | Must |
| FR-34 | `validity.code` 는 문자열 코드다. 문구 0건 | Must |
| FR-35 | `preflightDefaults` 에 목표가 필드가 **없다**(B1) | Must |
| FR-36 | 관심 종목 뷰모델에 판단 필드가 없다(D4) | Must |
| FR-37 | 해설 응답(`POST /explain`)도 판별 union 이다: `{ renderable: true; modeReasoning; validity; keyDrivers; risks; newsSummary (≤5); trackRecord; failureCases; disclaimer; generatedAt; source } \| { renderable: false; blockedReason }`. 예상 수익 필드 0건(B3) | Must |
| FR-38 | preflight 응답에 `maxLossOfTotalRate` 를 더한다. 게이트 · 차단 · 주문 필드 0건 유지(FR-17) | Must |

## Acceptance Criteria

- [ ] 신규 3경로(`/coach/report` 포함)가 등록되고 기존 10경로가 확장된다 (개정 2026-09-21)
- [ ] **`renderable`·`blockedReason`이 모든 추천 응답에 있다** (타입으로 필수 강제)
- [ ] `signalTrackRecord` null ↔ `renderable: false` 정합이 유지된다
- [ ] `failureCases` 빈 배열 ↔ `renderable: false` 정합이 유지된다
- [ ] `renderable: false`가 200이다
- [ ] `scoreNote`·`disclaimer`가 항상 있다
- [ ] `behaviorFacts`가 코드 + params이고 완성 문장이 0건이다
- [ ] `trendHold.conditionCode`가 코드다
- [ ] `excluded[]`에 `kr_stock`이 있다
- [ ] `feedback`에 내가 남긴 피드백이 담긴다
- [ ] `lowSample`이 담긴다
- [ ] 금액이 정수다
- [ ] 기존 5경로 응답 스냅샷이 하위 호환이다
- [ ] `generate` 쿨다운이 429 + `retryAfterSeconds`다
- [ ] `explain`이 인증을 요구한다
- [ ] **`trade-preflight` 응답에 게이트·차단 필드가 0건이다**
- [ ] `/ai-coach/detail` 이 `SymbolCoachViewModel` 이고 `packages/core` 에서 공유된다
- [ ] **`ModeCoachViewModel` 의 `renderable: false` 분기에 `judgment` · `trackRecord` 가 없다** (타입)
- [ ] **`confidence` 가 모든 뷰모델에서 0건이다**
- [ ] `zone` 이 판정과 무관하게 있고 `notPrediction: true` 다
- [ ] `preflightDefaults` 에 목표가가 0건이다
- [ ] 해설 응답이 판별 union 이고 `newsSummary` ≤ 5 · 예상 수익 필드 0건이다
- [ ] preflight 에 `maxLossOfTotalRate` 가 있다
- [ ] 성적표 그룹에 `returnDistribution` · `hits` · `misses` 가 있다
- [ ] `behaviorFacts` 에 `invoiceLink` 가 0건이다 (ADR-002)
- [ ] 관심 종목 뷰모델에 판단 필드가 0건이다

## Dependencies

- **선행:** `BFF-REQ-023` · `SRV-REQ-025`
- **소비:** `FE-REQ-028`(F004 API) · `RN-REQ-022`(F004 API)

## Open Questions

- `renderable`과 `signalTrackRecord`의 정합을 **타입으로 강제할 수 있는가.** discriminated union으로 `{ renderable: true, signalTrackRecord: SignalTrackRecord } | { renderable: false, blockedReason: string }` 형태가 가능하다 → **그게 가장 안전하다.** **2026-09-21**: 종목 판단 뷰모델에서 이 형태로 확정(FR-31). 코치 리포트 `CoachDetailViewModel` 도 같은 형태로 맞출지는 FE-REQ-028 과 함께 정한다.
- `feedback` 필드를 담으면 조회가 하나 늘어난다. 사용자 ≤10명이면 문제가 아니다.
- ~~`invoiceLink`를 BFF가 만들지 프론트가 만들지~~ — ADR-002 로 닫힘.
- **Q3** — 미보유 주식의 `zone` 은 결정 전 `unavailable(scope_undecided)`.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. `/api/app/ai-coach/detail` 을 종목 판단으로 개정하고 `/api/app/coach/report` 신설. 신규 FR-30~38 · `SymbolCoachViewModel`(모드별 `renderable` 판별 union(B10) · `zone`(D2) · `gaugeTrackRecords`(B9) · `validity` · **`confidence` 없음**(D3) · 목표가 기본값 없음(B1)), 해설 union(B3), 성적표 분포 · hits/misses(B17 · B2). `invoiceLink` 제거(ADR-002) |
