---
id: SRV-REQ-021
feature: F003
area: srv
kind: API
title: "F003 밸류에이션 밴드 적립 — REST 계약 정의"
priority: high
labels: [api, rest, contract, plan, indicator]
created: 2026-09-09
---

## Summary

`plan`과 `indicator` 컨텍스트의 HTTP 노출면. **`indicator`의 공개 API는 F004도 쓴다.**

## 엔드포인트

### `plan`

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/plan/weekly` | Y | `?weekOf?` | `WeeklyPlanResult` |
| POST | `/api/plan/weekly/complete` | Y | `{ weekOf, executions: [{ symbol, amountKrw }] }` | `{ streakWeeks, cumulativeKrw }` |
| GET/PATCH | `/api/plan/settings` | Y | `{ assets: [{ symbol, weeklyBaseKrw, bandConfig }] }` | `{ settings[] }` |
| GET | `/api/plan/kimchi-premium` | Y | — | `{ premiumPct, upbitPrice, binancePriceKrw, fxRate, asOf, level, degraded }` |
| GET | `/api/plan/streak` | Y | `?weeks=12` | `{ streakWeeks, cumulativeKrw, skippedLast12 }` |

### `indicator` (F004도 소비)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/indicators` | Y | `?names=mvrv_z,cape` | `{ items: IndicatorState[] }` |
| GET | `/api/indicators/:indicator/track-record` | Y | — | `TrackRecord \| 404` |

## 응답 계약

```ts
type WeeklyPlanResult = {
  weekOf: string;                      // "2026-09-07" (KST 월요일)
  totalKrw: number;                    // 1,000원 단위
  items: Array<{
    symbol: string;
    assetType: 'crypto' | 'us_stock';
    weeklyBaseKrw: number;
    multiplier: number;                // 0 ~ 3
    amountKrw: number;

    band: { code: string; rangeCode: string };     // 코드. 문구는 프론트

    indicator: {
      name: string; value: number; percentile: number | null;
      asOf: string; staleDays: number; fallback: boolean;
    };
    secondaryIndicators: Array<{ name: string; value: number; noteCode: string }>;  // Puell 등. 표시만

    // ── 렌더 게이트 ──
    renderable: boolean;
    blockedReason: 'track_record_missing' | null;
    trackRecordId: string | null;      // 필수. 없으면 renderable: false
    // ────────────────

    reasonCode: string;                // 근거 코드
    reasonParams: Record<string, string | number>;
    narrative: string | null;          // LLM 문장 (선택적 보강)
  }>;

  kimchiPremium: {
    premiumPct: number;
    costKrwOnPlan: number;             // 이번 주 적립액 중 프리미엄 비용
    level: 'low' | 'normal' | 'high';
    noteCode: string;
    asOf: string;
  } | null;                            // 실패 시 null. 적립 숫자는 유지

  streak: { weeks: number; cumulativeKrw: number; skippedLast12: number };
  excluded: Array<{ assetType: 'kr_stock'; reasonCode: string }>;
  degraded: boolean;
  degradedReasons: string[];           // indicator_stale | indicator_unavailable | kimchi_unavailable
};

type IndicatorState = { name: string; value: number; percentile: number | null; asOf: string; staleDays: number; source: string };
type TrackRecord = {
  id: string; indicator: string; signalTypes: string[];
  hits: Array<{ date: string; event: string }>;
  misses: Array<{ date: string; event: string; outcome: string }>;
  summary: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`renderable`·`blockedReason`·`trackRecordId`를 항상 포함**한다. 실패 이력 게이트다 | Must |
| FR-2 | `trackRecordId`가 `null`이면 `renderable: false`다. **정합을 계약으로 보장**한다 | Must |
| FR-3 | `renderable: false`가 **200**이다 | Must |
| FR-4 | `band.code`·`reasonCode`·`noteCode`·`degradedReasons`는 **코드**다. 문구는 프론트 | Must |
| FR-5 | `secondaryIndicators`(Puell)는 **표시용**이다. `multiplier`에 영향하지 않음을 계약으로 명시 | Must |
| FR-6 | `indicator.fallback`·`staleDays`를 담는다. 화면이 `지표 3일 지연` 배지를 만든다 | Must |
| FR-7 | `kimchiPremium`이 `null`일 수 있다. **그래도 `items`의 금액은 유효**하다 | Must |
| FR-8 | `excluded[]`에 국내주식 제외를 담는다 | Must |
| FR-9 | 금액은 **1,000원 단위**다. 원 단위가 아니다 | Must |
| FR-10 | `multiplier`는 소수(0~3)다 | Must |
| FR-11 | `PATCH /settings` 후 **다음 계획부터 반영**된다. 이미 만든 계획을 소급 변경하지 않는다 | Must |
| FR-12 | `POST /complete`는 멱등이다. 같은 주차·심볼 재호출이 중복을 만들지 않는다 | Must |
| FR-13 | `GET /indicators/:indicator/track-record`가 없으면 **404**다. F004가 이것으로 게이트를 판정한다 | Must |
| FR-14 | **매도 지시 문구를 서버가 만들지 않는다.** `Z ≥ 7`이어도 `amountKrw: 0`일 뿐 | Must |
| FR-15 | Swagger 작성. 응답 예시에 실제 금액을 넣지 않는다 | Must |

## Acceptance Criteria

- [ ] 엔드포인트 7개가 등록된다
- [ ] **`renderable`·`blockedReason`·`trackRecordId`가 모든 `items`에 있다**
- [ ] `trackRecordId: null` ↔ `renderable: false` 정합이 유지된다
- [ ] `renderable: false`가 200이다
- [ ] 문구 필드가 전부 코드다 (사용자 문장 0건)
- [ ] `secondaryIndicators`가 `multiplier`에 영향하지 않는다
- [ ] `fallback`·`staleDays`가 담긴다
- [ ] `kimchiPremium: null`에서도 `items` 금액이 유효하다
- [ ] `excluded[]`에 국내주식이 있다
- [ ] 금액이 1,000원 단위다
- [ ] `PATCH /settings`가 과거 계획을 바꾸지 않는다
- [ ] `POST /complete`가 멱등이다
- [ ] `track-record`가 없으면 404다
- [ ] **`Z ≥ 7`에서 `amountKrw: 0`이고 매도 지시 문구가 0건이다**
- [ ] Swagger가 렌더되고 예시에 실제 금액이 없다

## Dependencies

- **선행:** `SRV-REQ-020`(도메인) · `DB-REQ-013`~`016`
- **소비:** `BFF-REQ-021`(F003 UPSTREAM) · **`SRV-REQ-024`(F004가 `track-record`를 부른다)**

## Open Questions

- `GET /indicators/:indicator/track-record`를 F004가 직접 부를지, `coach`가 `indicator/application/api`를 ACL로 부를지. **후자가 DDD 규칙에 맞다** — HTTP는 프론트용이다.
- `POST /complete`의 `executions` 배열이 부분 실행(일부 심볼만)을 허용하는지.
- `reasonParams`의 구조를 코드별로 좁힐 수 있는지(discriminated union).
