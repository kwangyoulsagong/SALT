---
id: BFF-REQ-020
feature: F003
area: bff
kind: API
title: "F003 밸류에이션 밴드 적립 — 프론트 대면 계약 정의"
priority: high
labels: [bff, api, contract, viewmodel, plan]
created: 2026-09-09
---

## Summary

주간 계획 뷰모델. **게이트 필드(`renderable`·`trackRecordId`)** 와 **지표 상태(`fallback`·`staleDays`)** 가 계약의 핵심이다.

## 엔드포인트

| Method | Path | 용도 | 소비자 |
|---|---|---|---|
| GET | `/api/app/plan/weekly` | 주간 계획 + 김프 + 연속 주차 | 홈 블록 · 적립 화면 |
| POST | `/api/app/plan/weekly/complete` | 적립 완료 | 적립 화면 |
| GET/PATCH | `/api/app/plan/settings` | 기본액·밴드 설정 | 설정 |
| GET | `/api/app/plan/indicators` | 지표 상태 + 실패 이력 | 밴드 표·실패 이력 |
| GET | `/api/app/plan/kimchi-premium` | 김프 단독 | 갱신용 |

## 뷰모델

```ts
type WeeklyPlanViewModel = {
  weekOf: string;                      // KST 월요일
  totalKrw: number | null;             // 실패 시 null
  status: 'ok' | 'unavailable';

  items: Array<{
    symbol: string;
    assetType: 'crypto' | 'us_stock';
    weeklyBaseKrw: number;
    multiplier: number;                // 0 ~ 3
    amountKrw: number;                 // 1,000원 단위

    band: { code: string; rangeCode: string };

    indicator: {
      name: string; value: number; percentile: number | null;
      asOf: string; staleDays: number; fallback: boolean;
    };
    secondaryIndicators: Array<{ name: string; value: number; noteCode: string }>;

    // ── 렌더 게이트 ──
    renderable: boolean;
    blockedReason: 'track_record_missing' | null;
    trackRecordId: string | null;
    // ────────────────

    reasonCode: string;
    reasonParams: Record<string, string | number>;
    narrative: string | null;
  }>;

  kimchiPremium: {
    premiumPct: number;
    costKrwOnPlan: number;
    level: 'low' | 'normal' | 'high';
    noteCode: string;
    asOf: string;
  } | null;                            // 실패 시 null. items 는 유효

  streak: { weeks: number; cumulativeKrw: number; skippedLast12: number };
  excluded: Array<{ assetType: 'kr_stock'; reasonCode: string }>;
  degraded: boolean;
  degradedReasons: string[];
};

type IndicatorPanelViewModel = {
  indicators: Array<{ name: string; value: number; percentile: number | null; asOf: string; staleDays: number }>;
  trackRecords: Array<{
    id: string; indicator: string;
    hits: Array<{ date: string; event: string }>;
    misses: Array<{ date: string; event: string; outcome: string }>;
    summary: string;
  }>;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`renderable`·`blockedReason`·`trackRecordId`를 항상 포함**한다 | Must |
| FR-2 | `trackRecordId: null` ↔ `renderable: false` **정합을 계약으로 보장**한다 | Must |
| FR-3 | `renderable: false`가 200이다 | Must |
| FR-4 | **`kimchiPremium`이 `null`이어도 `items` 금액은 유효**하다. 이것을 타입으로 분리한다 | Must |
| FR-5 | `indicator.fallback`·`staleDays`를 담는다 | Must |
| FR-6 | `secondaryIndicators`가 **배수에 영향하지 않음**을 문서에 명시한다 | Must |
| FR-7 | 금액이 **1,000원 단위**다 | Must |
| FR-8 | `multiplier`는 소수(0~3)다 | Must |
| FR-9 | 문구 필드가 전부 **코드**다 | Must |
| FR-10 | `excluded[]`에 국내주식이 있다 | Must |
| FR-11 | `streak`에 `skippedLast12`가 있다. **비난 없이 사실만** 표시할 근거 | Must |
| FR-12 | `POST /complete`가 `{ streakWeeks, cumulativeKrw }`를 반환한다 | Must |
| FR-13 | `PATCH /settings` 후 **다음 계획부터 반영**됨을 응답에 명시한다(`appliedFrom`) | Should |
| FR-14 | 뷰모델 타입을 `packages/core`로 공유 | Should |

## Acceptance Criteria

- [ ] 엔드포인트 5개가 등록된다
- [ ] **게이트 필드 3개가 모든 `items`에 있다**
- [ ] `trackRecordId: null` ↔ `renderable: false` 정합이 유지된다
- [ ] `renderable: false`가 200이다
- [ ] **`kimchiPremium: null`에서 `items` 금액이 유효하다**
- [ ] `fallback`·`staleDays`가 담긴다
- [ ] `secondaryIndicators`가 배수에 영향하지 않는다
- [ ] 금액이 1,000원 단위다
- [ ] 문구 필드가 전부 코드다
- [ ] `excluded[]`에 국내주식이 있다
- [ ] `skippedLast12`가 있다
- [ ] `POST /complete`가 연속 주차·누적액을 반환한다
- [ ] `PATCH /settings` 응답에 `appliedFrom`이 있다

## Dependencies

- **선행:** `BFF-REQ-019` · `SRV-REQ-021`
- **소비:** `FE-REQ-024`(F003 API) · `RN-REQ-018`(F003 API) · **홈 블록**(`BFF-REQ-028`)

## Open Questions

- `kimchiPremium: null`과 `items` 유효성을 **타입으로 분리**할 방법. 현재는 `null` 허용 필드일 뿐이라 화면이 잊을 수 있다.
- 홈 블록(`weekly-plan`)이 이 뷰모델의 일부를 쓴다. **필드명이 갈리지 않게** 같은 타입에서 파생시켜야 한다.
