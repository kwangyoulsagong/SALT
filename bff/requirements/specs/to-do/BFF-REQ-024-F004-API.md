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
| GET | `/api/app/ai-coach/detail` | 코치 상세 (기존, 필드 추가) | 코치 탭 |
| GET | `/api/app/coach/scoreboard` | 신호 성적표 표 (신규) | 코치 탭 |
| GET | `/api/app/coach/generation-status` | 쿨다운 남은 시간 (신규) | 재생성 버튼 |
| GET/PATCH | `/api/app/ai-coach/profile` | 성향 설정 (기존) | 설정 |
| POST | `/api/app/ai-coach/feedback` | 피드백 (기존, `reasonCode`) | 추천 카드 |
| POST | `/api/app/ai-coach/explain` | 즉석 해설 (기존, **인증 추가**) | 프리뷰 |
| POST | `/api/app/ai-coach/generate` | 재생성 (기존, **429**) | 새로 생성 |
| GET | `/api/app/profit-plan` | 익절 플랜 (기존, `distancePct`) | 코치 탭 |
| GET | `/api/app/signal-performance` | 성적표 (기존, `groupBy`) | 코치 탭 |
| POST | `/api/app/trade-preflight` | 주문 전 계산 (기존) | 코치 탭 |
| GET | `/api/app/behavior-coach` | 행동 기록 (기존, `factCode`) | 코치 탭 |

## 뷰모델

```ts
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

  behaviorFacts: Array<{ factCode: string; params: Record<string, string | number>; amountKrw: number | null; invoiceLink: string | null }>;

  excluded: Array<{ assetType: 'kr_stock'; reasonCode: string }>;
  disclaimer: string;
};

type ScoreboardViewModel = {
  groups: Array<{ signalType: string; sample: number; winRate: number; avgReturn: number; maxDrawdown: number; lowSample: boolean }>;
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

## Acceptance Criteria

- [ ] 신규 2경로가 등록되고 기존 10경로가 확장된다
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

## Dependencies

- **선행:** `BFF-REQ-023` · `SRV-REQ-025`
- **소비:** `FE-REQ-028`(F004 API) · `RN-REQ-022`(F004 API)

## Open Questions

- `renderable`과 `signalTrackRecord`의 정합을 **타입으로 강제할 수 있는가.** discriminated union으로 `{ renderable: true, signalTrackRecord: SignalTrackRecord } | { renderable: false, blockedReason: string }` 형태가 가능하다 → **그게 가장 안전하다.**
- `feedback` 필드를 담으면 조회가 하나 늘어난다. 사용자 ≤10명이면 문제가 아니다.
- `invoiceLink`를 BFF가 만들지 프론트가 만들지(`BFF-REQ-023` Open Question).
