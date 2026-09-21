---
id: FE-REQ-024
feature: F003
area: fe
kind: API
title: "F003 밸류에이션 밴드 적립 — 웹 API 연동 정의"
priority: high
labels: [fe, api, bff, plan]
created: 2026-09-09
---

## Summary

프론트는 **BFF만** 부른다. `salt-server`, 지표 제공자, Upbit/Binance를 직접 부르지 않는다.

## 엔드포인트

| 용도 | 메서드 | 경로 | 호출 위치 |
|---|---|---|---|
| 주간 계획 | GET | `/bff/plan/weekly` | RSC (홈 ②, 적립 상세) |
| 실패 이력 | GET | `/bff/indicator/{code}/track-record` | 클라이언트 (아코디언 lazy) |
| 적립 완료 | POST | `/bff/plan/weekly/{planId}/complete` | Server Action |
| 설정 조회 | GET | `/bff/plan/settings` | RSC (설정 화면 F006) |
| 설정 저장 | **PATCH** | `/bff/plan/settings` — body `{ monthlyBaseKrw }` 하나 | Server Action (설정 화면 · 온보딩 3단계). **개정 2026-09-21** — PUT→PATCH, 밴드 필드 제거(D9 · B12) |
| 이번 달 적립 합계 | GET | `/bff/plan/monthly-summary?month=` | RSC (목표 화면 상단). **신규 2026-09-21** — B20 |

## 응답 계약 (BFF-REQ-020 준수)

```ts
type WeeklyPlanViewModel = {
  planId: string;
  weekOf: string;              // YYYY-MM-DD (월요일, KST)
  totalAmount: number;         // 원, 1000 단위 정수
  currency: 'KRW';
  status: 'pending' | 'completed';
  completedAt: string | null;

  items: PlanItemViewModel[];
  kimchiPremium: KimchiPremiumViewModel | null;
  streak: { weeks: number; cumulativeAmount: number; missedWeeks: number };
  excluded: { assetClass: string; reason: string }[];
};

type PlanItemViewModel = {
  assetId: string;
  symbol: string;              // 'BTC' | 'VOO' ...
  baseAmount: number;          // 원, 1000 단위
  amount: number;              // 원, 1000 단위 (서버 계산 결과)

  // 렌더 게이트 - 이 3개가 판정의 전부다
  renderable: boolean;
  blockedReason: 'NO_TRACK_RECORD' | 'INDICATOR_STALE' | 'INDICATOR_UNAVAILABLE' | null;
  trackRecordId: string | null;

  // renderable === true 일 때만 의미가 있다
  multiplier: number | null;   // 0 | 0.25 | 0.5 | 1 | 2 | 3
  band: { code: string; label: string } | null;
  reasonCode: string | null;
  reasonParams: Record<string, string | number> | null;
  narrative: string | null;    // LLM 보강 문장. 없을 수 있다
  bandConfig: BandRow[] | null;
  indicator: { code: string; value: number; asOf: string; staleDays: number } | null;
  secondaryIndicators: { code: string; value: number; label: string }[];
};

type BandRow = { code: string; label: string; multiplier: number; current: boolean };

// 2026-09-21 — D9 · B12. BFF-REQ-020 PlanSettingsViewModel 과 같은 타입
type PlanSettingsViewModel = {
  configured: boolean;
  monthlyBaseKrw: number | null;
  assets: {
    symbol: string; monthlyBaseKrw: number; weeklyBaseKrw: number; enabled: boolean;
    band: { presetKey: string; version: number; editable: false; readOnlyReason: 'hit_rate_on_default_band';
            rows: { code: string; lower: number | null; upper: number | null; multiplier: number }[] };
  }[];
  limits: { minMonthlyKrw: number; maxMonthlyKrw: number; unitKrw: number };
};
type PlanSettingsPatch = { monthlyBaseKrw: number };

// 2026-09-21 — B20
type MonthlySummaryViewModel = {
  status: 'ok' | 'unavailable';
  month: string;
  executedKrw: number | null; plannedKrw: number | null; monthlyBaseKrw: number | null;
  progressPct: number | null; executedWeeks: number | null; totalWeeks: number | null; daysLeft: number | null;
};

type KimchiPremiumViewModel = {
  percent: number;             // +1.2
  level: 'low' | 'normal' | 'high';
  costAmount: number;          // 원. 이번 주 적립액 중 프리미엄 비용
  asOf: string;
};
```

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 타입은 `packages/core`에 두고 web·mobile이 **공유**한다 | Must |
| FR-2 | 런타임 파싱(zod)으로 검증한다. 실패는 `degraded`로 폴백하고 **크래시하지 않는다** | Must |
| FR-3 | `renderable` 필드가 **없으면 `false`** 다 (fail-closed 파싱) | Must |
| FR-4 | `multiplier: 0`은 정상 값이다. falsy 처리로 `null`과 섞지 않는다 | Must |
| FR-5 | `kimchiPremium: null`은 정상 값이다 | Must |
| FR-6 | `narrative: null`은 정상 값이다. 규칙 문장으로 렌더한다 | Must |
| FR-7 | 금액 필드는 **서버가 반올림한 정수**다. 프론트가 다시 반올림하지 않는다 | Must |
| FR-8 | complete는 `Idempotency-Key: {planId}:{weekOf}` 헤더를 보낸다 | Must |
| FR-9 | 인증은 **HttpOnly 쿠키**다. 토큰을 JS에서 읽지 않는다 | Must |
| FR-10 | RSC fetch에 `cache: 'no-store'`. 주간 계획은 사용자별 데이터다 | Must |
| FR-11 | 실패 이력 응답 `404`는 **정상 경로**다. 게이트가 이미 처리했다 | Must |
| FR-12 | **2026-09-21 추가 — D9.** `PlanSettingsPatch`에 밴드·배수·임계값 키가 **타입 수준에서** 없다. `band.editable`은 리터럴 `false`로 파싱한다 | Must |
| FR-13 | **2026-09-21 추가 — B12.** `GET /settings`의 `configured: false`는 200 정상 값이다. 온보딩 유도 근거로 쓴다 | Must |
| FR-14 | **2026-09-21 추가 — B20.** `MonthlySummaryViewModel` 숫자는 전부 서버 값이다. `progressPct: null`은 정상 값(계획 0) | Must |
| FR-15 | **2026-09-21 추가 — ADR-002.** complete 응답·요청에 원장 매칭 필드(`matched*`)가 0건이다 | Must |

## 에러 매핑

| 상태 | 코드 | 화면 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 로그인 리다이렉트 |
| 404 (plan) | `PLAN_NOT_READY` | 온보딩 유도 ("월 얼마씩?") |
| 404 (track-record) | — | 아코디언 미노출. **에러 아님** |
| 422 (settings) | `PLAN_BASE_AMOUNT_INVALID` (개정 2026-09-21) | 필드 아래에 서버 `min`·`max`·`unitKrw`로 오류 |
| 422 (settings) | `PLAN_BAND_READ_ONLY` (신규 2026-09-21 — D9) | 화면 오류 없음 · 로그만(폼이 보낼 수 없는 값이다) |
| 200 (settings) | `configured: false` (신규 2026-09-21 — B12) | 온보딩 3단계 유도 |
| 409 (complete) | `ALREADY_COMPLETED` | 체크 상태로 동기화. 토스트 없음 |
| 502/504 | `UPSTREAM_*` | "잠시 후 다시" + 재시도 |

## 금지

| ID | 요구사항 |
|---|---|
| FR-20 | `salt-server` 직접 호출 0건 |
| FR-21 | 지표 제공자·Upbit·Binance 직접 호출 0건 |
| FR-22 | 요청/응답에 거래소 API 키가 실리는 경로 0건 |
| FR-23 | **주문·출금 엔드포인트 문자열 0건** |
| FR-24 | 응답 원본을 콘솔에 통째로 로깅하는 코드 0건 |

## Acceptance Criteria

- [ ] 뷰모델 타입이 `packages/core`에 있고 web·mobile이 공유한다
- [ ] zod 파싱 실패가 크래시가 아니라 `degraded` 폴백이다
- [ ] **`renderable` 누락 시 `false`로 파싱된다**
- [ ] **`multiplier: 0`이 `null`과 구분된다**
- [ ] `kimchiPremium: null`·`narrative: null`이 정상 처리된다
- [ ] 프론트에 반올림 코드가 0건이다
- [ ] complete에 `Idempotency-Key`가 실린다
- [ ] 인증이 HttpOnly 쿠키고 JS 토큰 접근이 0건이다
- [ ] 주간 계획 RSC fetch가 `no-store`다
- [ ] `track-record` 404가 에러 UI를 띄우지 않는다
- [ ] 409 complete가 조용히 동기화된다
- [ ] **BFF 외 직접 호출이 0건이다**
- [ ] **주문·출금 엔드포인트 문자열이 0건이다**
- [ ] 설정 저장이 `PATCH` + `{ monthlyBaseKrw }` 하나다 (D9)
- [ ] 422 두 코드가 위 표대로 매핑된다
- [ ] `monthly-summary` 호출과 타입이 있다 (B20)

## Dependencies

- **선행:** `BFF-REQ-020`(계약) · `BFF-REQ-021`(upstream)
- **짝:** `FE-REQ-022`(UI) · `023`(FUNC) · `025`(PERF)

## Open Questions

- `bandConfig`가 항목마다 반복되면 응답이 커진다. 응답 루트에 한 번만 담고 항목이 참조할지.
- 이 REQ의 경로(`/bff/plan/*`)·필드명(`totalAmount`·`planId`)이 `BFF-REQ-020`(`/api/app/plan/*`·`totalKrw`)과 다르다. 2026-09-21 이전부터 있던 드리프트 — 착수 전 BFF 계약 기준으로 통일.
- complete의 `Idempotency-Key`를 프론트가 만들면 재설치 후 키가 달라질 수 있다. 서버가 `planId+weekOf`로 자체 중복 판정도 해야 한다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 설정 저장 PUT→PATCH · 월 적립액 1필드(D9 · B12), `monthly-summary` 신설(B20), 422 코드 개정. FR-12~15 추가 |
