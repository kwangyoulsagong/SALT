---
id: BFF-REQ-028
feature: F006
area: bff
kind: API
title: "F006 코치 대화 & 3탭 IA — 프론트 대면 계약 정의 (SSE + 홈 뷰모델)"
priority: critical
labels: [bff, api, sse, contract, viewmodel, home]
created: 2026-09-09
---

> **2026-09-21 개정.** `ADR-002` — `HomeViewModel`은 **3블록**(세금 · 청구서 · 보유 미리보기 · 알림 목록 삭제, `unreadAlertCount` 추가). 포지션 · 거래 기록 · 알림 · 설정 · 온보딩 계약을 추가했다(§2026-09-21 계약). 근거: 스토리보드 갭 감사 D5 · D6 · D9 · B12 · B13 · B14 · B16.

## Summary

대화 SSE 계약과 홈 3블록 뷰모델(2026-09-21 개정). **웹은 블록별, 모바일은 집계**이고 두 형태가 같은 함수에서 나온다. 여기에 포지션 · 거래 기록 · 알림 · 설정 계약이 더해졌다.

## 엔드포인트

| Method | Path | 용도 | 소비자 |
|---|---|---|---|
| POST | `/api/app/coach/messages` | 메시지 전송 → `messageId` | 웹·모바일 |
| **GET** | **`/api/app/coach/messages/:messageId/stream`** | **SSE** | 웹·모바일 |
| GET | `/api/app/coach/conversations` | 대화 목록 (커서) | 웹·모바일 |
| GET | `/api/app/coach/conversations/:id/messages` | 메시지 목록 (역순 커서) | 웹·모바일 |
| DELETE | `/api/app/coach/conversations/:id` | 삭제 (사용자 요청) | 웹·모바일 |
| GET | `/api/app/home` | **집계 1콜** | 모바일 |
| GET | `/api/app/home/blocks/:block` | 블록 1개(`total-asset` · `weekly-plan` · `coach`) | 웹 |
| GET | `/api/app/alerts` | 알림 **1종** 목록 *(개정 2026-09-21)* | 웹·모바일 |
| PATCH | `/api/app/alerts/:id/read` · `/api/app/alerts/read-all` | 읽음 · 모두 읽음 *(2026-09-21)* | 웹·모바일 |
| GET | `/api/app/alerts/unread-count` | 벨 배지 *(2026-09-21)* | 웹 |
| GET | `/api/app/portfolio` | 포지션 뷰모델 *(개정 2026-09-21)* | 웹·모바일 |
| GET | `/api/app/portfolio/performance` | `?range=1w\|1m\|3m\|1y` + MDD *(개정 2026-09-21)* | 웹·모바일 |
| GET/POST | `/api/app/portfolio/transactions` | 거래 목록 · 추가 *(2026-09-21)* | 웹·모바일 |
| POST | `/api/app/portfolio/transactions/preview` | 평단 전후 미리보기 *(2026-09-21)* | 웹·모바일 |
| PATCH/DELETE | `/api/app/portfolio/transactions/:id` | 수정 · 삭제 *(2026-09-21)* | 웹·모바일 |
| GET | `/api/app/settings` | 설정 한 화면 *(2026-09-21)* | 웹·모바일 |
| PATCH | `/api/app/settings/alerts` | 알림 켜기/끄기 *(2026-09-21)* | 웹·모바일 |
| POST | `/api/app/onboarding/steps/first-holding/skip` | 온보딩 2단계 건너뛰기 *(2026-09-21)* | 웹·모바일 |
| GET/PUT | `/api/app/panel-layout` | PC 배치 | 웹 |

## SSE 계약

```
event: message.start   data: { messageId, conversationId, createdAt }
event: message.delta   data: { text }
event: message.card    data: { ...CardViewModel }     ← 완성 객체 1회
event: message.done    data: { messageId, tokenCount, explanationSource }
event: message.error   data: { code, fallbackText }
event: ping            data: {}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `POST`가 **즉시 201 + `messageId`** 를 반환한다. LLM을 기다리지 않는다 | Must |
| FR-2 | `GET stream`이 `Last-Event-ID`를 지원한다 | Must |
| FR-3 | **카드는 단일 이벤트**다. `delta`에 카드 조각이 0건 | Must |
| FR-4 | `CardViewModel`에 **`renderable`·`blockedReason`·`signalTrackRecord`·`failureCases`** 가 있다. 대화 안 카드도 게이트를 통과한다 | Must |
| FR-5 | `message.error`에 **`fallbackText`** 가 있다. 화면이 빈 채로 남지 않는다 | Must |
| FR-6 | `explanationSource`(`llm`/`rule`)를 `done`에 담는다. 화면이 배지를 표시한다 | Must |
| FR-7 | `ping` 15초 | Must |
| FR-8 | 이미 완료된 메시지에 붙으면 **전문 1회 + `done`** | Must |

## 홈 뷰모델

```ts
type HomeViewModel = {
  asOf: string;
  onboarding: { complete: boolean; nextStep: 'invite' | 'first_holding' | 'set_plan' | null };   // 2026-09-21 (B12)
  degradedBlocks: string[];

  totalAsset: {
    totalKrw: number | null;                  // 실패 시 null. 0 금지
    changeKrw: number | null; changePct: number | null; changeWindow: '1d';
    byAssetClass: Array<{ assetClass: 'crypto' | 'kr_stock' | 'us_stock'; valueKrw: number; weight: number }>;
    fxRateUsed: number | null;
    fxBasisCode: 'current_rate' | null;       // 2026-09-21: 전부 원화면 null. 세금 비교 삭제(ADR-002)
    status: 'ok' | 'unavailable' | 'degraded';
  };

  weeklyPlan: {
    weekOf: string; totalKrw: number | null;
    items: Array<{ symbol: string; amountKrw: number; multiplier: number; bandCode: string }>;
    status: 'ok' | 'unavailable';
  } | null;

  coach: {
    action: 'buy' | 'sell' | 'hold' | 'rebalance' | null;
    symbol: string | null; score: number | null; scoreNote: string | null;
    renderable: boolean; blockedReason: string | null;   // 게이트
    status: 'ok' | 'unavailable';
  } | null;

  // 2026-09-21 삭제: taxDeadline · invoice (ADR-002) · holdingsPreview · alerts[] (D6)
  unreadAlertCount: number | null;          // 헤더 벨 배지 (모바일 집계에서 별도 호출 방지)
  disclaimer: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **블록 순서를 계약으로 고정**한다: 총자산 → 적립 → 추천. 화면이 순서를 바꾸지 않는다. **개정 2026-09-21** (D6 · ADR-002) | Must |
| FR-21 | **금액 실패 시 `null`.** `0` 금지 | Must |
| FR-22 | 블록마다 `status`가 있고 `degradedBlocks[]`가 최상위에 있다 | Must |
| FR-23 | AI 추천에 **`renderable`·`blockedReason`·`scoreNote`** 가 있다 | Must |
| FR-24 | 비원화 환산이 있으면 **`fxBasisCode`가 있다.** 화면이 "현재 환율 기준" 툴팁을 띄운다. **개정 2026-09-21** — 세금 비교 삭제 | Must |
| FR-25 | `disclaimer`가 있다 | Must |
| FR-26 | 알림은 **1종(`signal_update`)** 이고 `messageCode` + `params` + `target`이다. **개정 2026-09-21** (D5) | Must |
| FR-27 | ~~`holdingsPreview` 5개 이하~~ **삭제 2026-09-21** (D6). 홈에 `unreadAlertCount`가 있다 | Must |
| FR-28 | 블록별 엔드포인트 응답이 집계의 해당 필드와 **동일**하다 | Must |
| FR-29 | 메시지 목록이 **역순 커서 페이징**이다 | Must |
| FR-30 | 홈에 `Cache-Control: no-store` | Must |
| FR-31 | 뷰모델·SSE 타입을 `packages/core`로 공유 | Should |
| FR-32 | `treeJson` 16KB 초과 시 413 | Must |

## 2026-09-21 계약 — 포지션 · 거래 기록 · 알림 · 설정

```ts
type PositionViewModel = {
  asOf: string;
  hero: { status: 'ok' | 'unavailable';
          totalValueKrw: number | null; pnlKrw: number | null; pnlPct: number | null; principalKrw: number | null;
          holdingCount: number; maxWeight: { symbol: string; pct: number } | null; return30dPct: number | null };
  holdings: { status: 'ok' | 'unavailable'; items: Array<{ symbol: string; assetType: string; weightPct: number; valueKrw: number; pnlPct: number }> };
  risk: { status: 'ok' | 'unavailable';
          axes: Array<{ key: 'concentration' | 'volatility' | 'drawdown' | 'newsRisk'; value: number | null; limit: number; breached: boolean; reasonCode: string | null }> };
};
type PerformanceViewModel = { range: '1w' | '1m' | '3m' | '1y'; points: Array<{ t: string; valueKrw: number }>;
                              worstObservedReturn: { pct: number; peakAt: string; troughAt: string } | null };
type TransactionInput = { symbol: string; assetType: string; side: 'buy' | 'sell'; quantity: number; price: number; fee?: number; transactionDate: string; note?: string };
type TransactionPreviewViewModel = { symbol: string; before: { quantity: number; avgPrice: number | null }; after: { quantity: number; avgPrice: number | null }; totalCostKrw: number };
type AlertViewModel = { id: string; messageCode: string; params: Record<string, string | number>; target: 'coach' | 'home.weekly-plan'; isRead: boolean; createdAt: string };
type SettingsViewModel = {
  plan:   { status; monthlyBaseKrw: number | null; weeklyBaseKrw: number | null;     // 주간 환산은 서버 값
            bandThresholds: { mvrvZ: number[]; capePercentile: number[] }; bandThresholdsEditable: false };
  coach:  { status; riskTolerance: string | null; maxSingleAssetWeight: number | null; defaultMode: 'short' | 'long' | null; notificationLevel: string | null };  // F004 소유 — 필드 이름은 `FE-REQ-026` FR-80
  alerts: { status; alertsEnabled: boolean | null };
};
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 포지션 뷰모델은 **섹션별 `status`** 를 갖는다. 실패한 섹션의 금액은 `null`이다(0 금지) **(기본안 — 감사 문서 B13)** | Must |
| FR-41 | `risk.axes`는 **정확히 4개**다. 현금 비중 축 0건 | Must |
| FR-42 | `PerformanceViewModel.range`는 4값(`1w` · `1m` · `3m` · `1y`)이다 | Must |
| FR-43 | 거래 쓰기 요청 본문은 `TransactionInput`이다. 결제일 · 환율 필드 0건 (ADR-002) **(기본안 — 감사 문서 B14)** | Must |
| FR-44 | 미리보기 · 쓰기 에러는 `{ code: 'INSUFFICIENT_QUANTITY' \| 'VALIDATION' \| ..., field? }` — 문구 0건 | Must |
| FR-45 | `AlertViewModel.target`은 코드다. 경로 문자열 0건 | Must |
| FR-46 | `SettingsViewModel`의 `bandThresholdsEditable`은 **항상 `false`** 다 (D9) | Must |
| FR-47 | `SettingsViewModel`에 계좌 · 세금 · 보류 토글 필드 0건 (B19) | Must |
| FR-48 | 신규 뷰모델을 `packages/core`로 공유한다(FR-31과 같은 원칙) | Should |

## Acceptance Criteria

- [ ] `POST /messages`가 201 + `messageId`를 즉시 반환한다
- [ ] SSE로 `delta`가 흐르고 **첫 토큰이 1s 이내**에 온다
- [ ] `Last-Event-ID` 재연결이 동작한다
- [ ] **카드가 단일 이벤트이고 `delta`에 카드 조각이 0건이다**
- [ ] `CardViewModel`에 게이트 필드 4개가 있다
- [ ] `message.error`에 `fallbackText`가 있다
- [ ] `done`에 `explanationSource`가 있다
- [ ] `ping`이 15초 주기다
- [ ] 완료된 메시지에 붙으면 전문 1회 + `done`이다
- [ ] **홈 블록 순서가 계약으로 고정된다** (총자산 → 적립 → 추천)
- [ ] 금액 실패 시 `null`이고 `0`이 0건이다
- [ ] 블록마다 `status`가 있고 `degradedBlocks[]`가 있다
- [ ] AI 추천에 게이트 필드와 `scoreNote`가 있다
- [ ] 비원화 환산이 있으면 `fxBasisCode`가 있고 전부 원화면 `null`이다
- [ ] `disclaimer`가 있다
- [ ] 알림이 1종이고 `messageCode` + `params` + `target`이다
- [ ] 홈에 `taxDeadline` · `invoice` · `holdingsPreview` · `alerts[]`가 0건이고 `unreadAlertCount`가 있다
- [ ] 블록별 응답이 집계와 동일하다
- [ ] 메시지 목록이 역순 커서 페이징이다
- [ ] 홈에 `Cache-Control: no-store`가 있다
- [ ] `treeJson` 16KB 초과 시 413이다
- [ ] 포지션 뷰모델 섹션별 `status`가 있고 실패 섹션 금액이 `null`이다
- [ ] 레이더 축이 정확히 4개다
- [ ] 성과 `range`가 4값이고 MDD가 있다
- [ ] 거래 입력에 결제일 · 환율 필드가 0건이다
- [ ] 에러가 코드로만 온다
- [ ] 알림 읽음 · 모두 읽음 · 안 읽은 수 계약이 있다
- [ ] 설정에 `bandThresholdsEditable: false`가 있고 계좌 · 세금 · 보류 토글 필드가 0건이다
- [ ] 온보딩 `nextStep`에 `link_account`가 0건이다

## Dependencies

- **선행:** `BFF-REQ-027` · `SRV-REQ-029`
- **소비:** `FE-REQ-032`(F006 API) · `RN-REQ-026`(F006 API)

## Open Questions

- SSE 타입을 `packages/core`에 두려면 BFF가 그 패키지를 참조해야 한다(`BFF-REQ-006` Open Question).
- 블록별 엔드포인트 3개가 인증을 3번 거친다(2026-09-21 개정). 측정 후 판단.
- `CardViewModel`을 F004의 `recommendation`과 **같은 타입**으로 쓸 수 있는가. 그러면 화면이 카드 컴포넌트를 재사용한다 → **같은 타입이 맞다.**
- `SettingsViewModel.coach` 필드 이름은 F004 계약(`FE-REQ-026` FR-80 · `riskTolerance` 등)에 맞췄다(2026-09-21 대조). `alerts.alertsEnabled`(전체 켜기/끄기, F006)와 `coach.notificationLevel`(켜져 있을 때의 빈도, F004)은 **둘 다 둔다** — 감사 문서 B34.
- `assetType`을 거래 입력에 둘지는 감사 Q2(자산군 3종)에 달려 있다. 크립토 하나로 줄면 필드가 빠진다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 엔드포인트 표 · `HomeViewModel`(3블록, `unreadAlertCount`, `fxBasisCode` nullable, `first_holding`) · FR-20 · FR-24 · FR-26 · FR-27. 추가: 포지션 · 성과 · 거래 · 미리보기 · 알림 · 설정 뷰모델과 FR-40~48(B13 · B14 · D5 · D9 · B16 · B19). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |
