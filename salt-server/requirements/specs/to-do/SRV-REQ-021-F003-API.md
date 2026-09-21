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
| POST | `/api/plan/weekly/complete` | Y | `{ weekOf, executions: [{ symbol, amountKrw? }] }` — 수동 체크만. `amountKrw` 생략 시 `plannedKrw` (개정 2026-09-21 — B20) | `{ streakWeeks, cumulativeKrw }` |
| GET | `/api/plan/settings` | Y | — | `PlanSettingsResult` (개정 2026-09-21 — D9) |
| PATCH | `/api/plan/settings` | Y | `{ monthlyBaseKrw }` — **밴드 키 금지** (개정 2026-09-21 — D9 · B12) | `PlanSettingsResult` |
| GET | `/api/plan/monthly-summary` | Y | `?month=YYYY-MM` (생략 시 이번 달 KST) | `MonthlySummaryResult` (신규 2026-09-21 — B20) |
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

// ── 2026-09-21 추가 — D9 · B12 ──
type PlanSettingsResult = {
  configured: boolean;                 // false = PlanSettings 0건 (온보딩 전). 404가 아니다
  monthlyBaseKrw: number | null;       // 사용자가 넣은 원값
  assets: Array<{
    symbol: string;
    assetType: 'crypto' | 'us_stock';
    monthlyBaseKrw: number;            // 이 자산 몫
    weeklyBaseKrw: number;             // 서버 환산 (×12÷52, 1,000원 반올림)
    enabled: boolean;
    band: {
      presetKey: string;               // "mvrv_z" | "cape_percentile"
      version: number;
      editable: false;                 // 항상 false
      readOnlyReason: 'hit_rate_on_default_band';
      rows: Array<{ code: string; lower: number | null; upper: number | null; multiplier: number }>;
    };
  }>;
  limits: { minMonthlyKrw: number; maxMonthlyKrw: number; unitKrw: 1000 };
  conversion: { ruleCode: 'monthly_x12_div52'; roundingKrw: 1000 };
};

// ── 2026-09-21 추가 — B20 ──
type MonthlySummaryResult = {
  month: string;                       // "2026-09" (KST)
  executedKrw: number;                 // weekOf 가 이 달인 executed 행 합
  plannedKrw: number;                  // 같은 행들의 계획액 합 (배수 반영)
  monthlyBaseKrw: number | null;       // 설정값 (비교용)
  progressPct: number | null;          // plannedKrw 0 이면 null
  executedWeeks: number;
  totalWeeks: number;
  daysLeft: number;                    // KST 말일까지
  asOf: string;
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
| FR-11 | `PATCH /settings` 후 **다음 계획부터 반영**된다. 이미 만든 계획을 소급 변경하지 않는다. 예외는 첫 저장(FR-20) | Must |
| FR-12 | `POST /complete`는 멱등이다. 같은 주차·심볼 재호출이 중복을 만들지 않는다 | Must |
| FR-13 | `GET /indicators/:indicator/track-record`가 없으면 **404**다. F004가 이것으로 게이트를 판정한다 | Must |
| FR-14 | **매도 지시 문구를 서버가 만들지 않는다.** `Z ≥ 7`이어도 `amountKrw: 0`일 뿐 | Must |
| FR-15 | Swagger 작성. 응답 예시에 실제 금액을 넣지 않는다 | Must |

### 2026-09-21 추가 — 설정 D9 · 온보딩 B12 · 이번 달 합계 B20

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **`PATCH /api/plan/settings`가 온보딩 3단계의 저장 API다**(기본안 — 감사 문서 B12). 사용자 `PlanSettings`가 0건이면 생성 + 그 주 계획 upsert, 있으면 갱신. 온보딩 전용 엔드포인트를 두지 않는다 | Must |
| FR-21 | 본문은 `{ monthlyBaseKrw: number }` 하나다. 정수 · 1,000원 단위 · `limits` 범위 밖이면 **422 `PLAN_BASE_AMOUNT_INVALID`** `{ field, min, max, unitKrw }` | Must |
| FR-22 | 본문에 `bandConfig`·`thresholds`·`multipliers`·`bands` 키가 있으면 **422 `PLAN_BAND_READ_ONLY`**(D9). 알 수 없는 키는 400 | Must |
| FR-23 | `GET /settings`는 설정이 없어도 **200 `configured: false`** 다. `GET /weekly`의 404 `PLAN_NOT_READY`와 짝 — 설정 화면이 온보딩 없이도 열린다 | Must |
| FR-24 | `band.editable`은 **항상 `false`**, `readOnlyReason`은 코드다. 문구는 프론트("과거 적중률이 기본 밴드 기준이라 바꿀 수 없습니다") | Must |
| FR-25 | `PATCH`는 멱등이다. 같은 값 재저장이 계획·행을 늘리지 않는다 | Must |
| FR-26 | `POST /weekly/complete`의 `amountKrw`는 선택이다. 생략 시 `plannedKrw`. 음수·상한 초과는 422 `PLAN_EXECUTION_INVALID`. **원장 자동 매칭이 없다**(ADR-002 · B20) | Must |
| FR-27 | `GET /monthly-summary`의 금액·진행률·남은 일수는 **서버 계산값**이다. 프론트는 표시만(공통 기준 ③) | Must |
| FR-28 | `GET /monthly-summary`는 계획이 0건이어도 200(`executedKrw: 0`·`progressPct: null`)이다 | Must |
| FR-29 | `month`가 `YYYY-MM`이 아니거나 미래 달이면 400 | Must |

## Acceptance Criteria

- [ ] 엔드포인트 9개가 등록된다 (2026-09-21: settings GET·PATCH 분리 + `monthly-summary`)
- [ ] **온보딩 첫 `PATCH /settings` 직후 `GET /weekly`가 200이다** (B12)
- [ ] 1,000원 단위·범위 위반이 422 `PLAN_BASE_AMOUNT_INVALID`다
- [ ] **밴드 키가 있는 본문이 422 `PLAN_BAND_READ_ONLY`다** (D9)
- [ ] `band.editable`이 항상 `false`다
- [ ] 설정 없는 사용자의 `GET /settings`가 200 `configured: false`다
- [ ] `monthly-summary`가 `executed`만 합산하고 계획 0건 달에 200이다 (B20)
- [ ] `POST /complete`에 `amountKrw`를 생략하면 `plannedKrw`로 기록된다
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
- `POST /complete`의 `executions` 배열이 부분 실행(일부 심볼만)을 허용하는지. 기본안: 허용 — 수동 체크는 심볼별이다.
- 수동 체크 취소 API(`DELETE /weekly/complete?weekOf&symbol`)를 둘지(`DB-REQ-014` Open Question).
- `monthly-summary`를 `GET /weekly` 응답에 넣을지 별도로 둘지. 별도로 둔 이유: 목표 화면은 주간 계획 전체가 필요 없다.
- `reasonParams`의 구조를 코드별로 좁힐 수 있는지(discriminated union).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. settings 계약 개정(D9 — 월 적립액만 편집, 밴드 읽기 전용) · 온보딩 저장 = `PATCH /settings`(B12) · `GET /monthly-summary` 신설(B20) · `complete` 수동 체크만(ADR-002). FR-20~29 추가, FR-11 개정 |
