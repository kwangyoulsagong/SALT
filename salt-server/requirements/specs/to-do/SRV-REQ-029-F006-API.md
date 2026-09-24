---
id: SRV-REQ-029
feature: F006
area: srv
kind: API
title: "F006 코치 대화 & 3탭 IA — REST/SSE 계약 정의"
priority: critical
labels: [api, rest, sse, streaming, conversation, home]
created: 2026-09-09
---

> **2026-09-21 개정.** `ADR-002` — 홈 블록 엔드포인트는 **3개**(`total-asset` · `weekly-plan` · `coach`), `HomeBriefingResult`에서 `taxDeadline` · `invoice` · `holdingsPreview` · `alerts[]`를 뺐다. 포지션 · 거래 미리보기 · 알림 · 온보딩 건너뛰기 · 알림 설정 계약을 추가했다(§2026-09-21 엔드포인트). 근거: 스토리보드 갭 감사 D5 · D6 · D9 · B12 · B13 · B14.

## Summary

대화는 **2단계**다: `POST`로 메시지를 만들고 `GET`으로 SSE를 연다. 그래야 재연결이 단순해진다. 홈은 `homebriefing` 조합 컨텍스트가 `GET /api/home`으로 낸다.

## 엔드포인트

### 대화

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/coach/messages` | Y | `{ conversationId?, content }` | `201 { messageId, conversationId }` |
| **GET** | **`/api/coach/messages/:messageId/stream`** | Y | `Last-Event-ID?` | **SSE** |
| GET | `/api/coach/conversations` | Y | `?limit&cursor` | `{ items[], nextCursor }` |
| GET | `/api/coach/conversations/:id/messages` | Y | `?limit&cursor` | `{ items[], nextCursor }` (역순) |
| DELETE | `/api/coach/conversations/:id` | Y | — | `204` (사용자 요청 시에만) |

### 홈

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/home` | Y | `HomeBriefingResult` (3블록) *(개정 2026-09-21)* |
| GET | `/api/home/blocks/:block` | Y | 블록 1개 (`total-asset`·`weekly-plan`·`coach`). 그 외 값은 404 *(개정 2026-09-21 — `tax-deadline`·`invoice` 삭제, ADR-002)* |

### 패널 배치

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET/PUT | `/api/panel-layout` | Y | `?surface=pc` / `{ surface, treeJson }` | `{ treeJson }` / `204` |

## SSE 계약

```
event: message.start   data: { "messageId": "...", "conversationId": "...", "createdAt": "..." }
event: message.delta   data: { "text": "부분 문자열" }
event: message.card    data: { ...CardPayload }          ← 완성 객체 1회
event: message.done    data: { "messageId": "...", "tokenCount": 123, "explanationSource": "llm" }
event: message.error   data: { "code": "LLM_TIMEOUT", "fallbackText": "..." }
event: ping            data: {}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **2단계 방식**(POST → GET stream)을 쓴다. 재연결이 같은 `messageId`로 붙으므로 멱등이 단순하다 | Must |
| FR-2 | `POST`는 **즉시 201**을 반환한다. LLM을 기다리지 않는다 | Must |
| FR-3 | `GET stream`이 `Last-Event-ID`를 받으면 **그 이후 델타부터** 보낸다 | Must |
| FR-4 | 이미 `complete`인 메시지에 붙으면 **전문을 한 번에** 보내고 `done`으로 닫는다 | Must |
| FR-5 | **카드는 `message.card` 단일 이벤트**다. `delta`로 흘리지 않는다 — 게이트가 부분 상태에서 판정되면 안 된다 | Must |
| FR-6 | `message.error`에 **`fallbackText`(규칙 기반 문장)** 를 함께 보낸다. 화면이 빈 채로 남지 않는다 | Must |
| FR-7 | **`ping`을 15초 주기**로 보낸다 | Must |
| FR-8 | 헤더: `Content-Type: text/event-stream` · `Cache-Control: no-cache` · **`X-Accel-Buffering: no`**. **압축을 끈다** | Must |
| FR-9 | 클라이언트 연결 종료(`req.on('close')`)를 감지해 **LLM을 취소**한다 | Must |
| FR-10 | 동시 스트림 상한을 둔다. 초과 시 429 | Must |
| FR-11 | 대화당 최대 60초. 초과 시 `message.error` + 스트림 종료 | Must |

## 응답 계약

```ts
type HomeBriefingResult = {
  asOf: string;
  onboarding: { complete: boolean; nextStep: 'invite' | 'first_holding' | 'set_plan' | null };   // 2026-09-21: link_account → first_holding (B12)
  degradedBlocks: string[];

  totalAsset: {
    totalKrw: number | null;
    changeKrw: number | null; changePct: number | null; changeWindow: '1d';
    byAssetClass: Array<{ assetClass: string; valueKrw: number; weight: number }>;
    fxRateUsed: number | null;
    fxBasisCode: 'current_rate' | null; // 2026-09-21: 전부 원화면 null. 세금 기준 비교 삭제(ADR-002)
    status: 'ok' | 'unavailable' | 'degraded';
  };

  weeklyPlan: { weekOf: string; totalKrw: number | null; items: Array<{ symbol: string; amountKrw: number; multiplier: number; bandCode: string }>; status } | null;

  coach: {
    action: string | null; symbol: string | null; score: number | null;
    renderable: boolean; blockedReason: string | null;    // 게이트
    scoreNote: string | null;
    status: 'ok' | 'unavailable';
  } | null;

  // 2026-09-21 삭제: taxDeadline · invoice (ADR-002), holdingsPreview · alerts[] (D6 — 홈에 목록 없음)
  unreadAlertCount: number | null;     // 헤더 벨 배지. 모바일 집계 1콜이 따로 부르지 않게
  disclaimer: string;
};

type CardPayload = {
  renderable: boolean;
  blockedReason: string | null;
  action: string; symbol: string; assetType: string; score: number; scoreNote: string;
  reasons: Array<{ type: string; message: string }>;
  signalTrackRecord: { signalType: string; sample: number; winRate: number; avgReturn: number; worstObservedReturn: number; lowSample: boolean } | null;
  failureCases: Array<{ date: string; event: string; outcome: string }>;
  insightId: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 홈 **금액 블록 실패 시 `null`**. `0` 금지 | Must |
| FR-21 | 비원화 환산이 있으면 `fxBasisCode: 'current_rate'`를 담아 **환율 기준**을 알린다. 전부 원화면 `null`. **개정 2026-09-21** — 세금 기준 비교 삭제(ADR-002) | Must |
| FR-22 | 홈 AI 추천 블록에 **`renderable`·`blockedReason`** 이 있다 | Must |
| FR-23 | `disclaimer`를 홈에도 담는다 | Must |
| FR-24 | 알림은 `messageCode` + `params`다. **완성 문장 0건** | Must |
| FR-25 | ~~`holdingsPreview`는 상위 5개~~ **삭제 2026-09-21** — 홈에 보유 목록이 없다(D6). 대신 `unreadAlertCount` | Must |
| FR-26 | 블록별 엔드포인트(`/api/home/blocks/:block`)를 제공한다. 웹 스트리밍이 소비한다 | Must |
| FR-27 | 블록별 응답이 집계 응답의 해당 필드와 **동일**하다 | Must |
| FR-28 | 메시지 목록은 **역순 커서 페이징**이다 | Must |
| FR-29 | `DELETE /conversations/:id`는 **사용자 요청 시에만**. 자동 삭제 경로가 없다 | Must |
| FR-30 | `PUT /panel-layout`은 `treeJson` **크기 상한 16KB**. 초과 시 413 | Must |
| FR-31 | 홈을 캐시하지 않는다(`Cache-Control: no-store`) | Must |
| FR-32 | Swagger에 SSE 이벤트 계약을 문서화한다 | Must |

## 2026-09-21 엔드포인트 — 포지션 · 알림 · 온보딩 · 설정

### 포지션 (`/api/portfolio` 유지, B13 · B14)

| Method | Path | 상태 | Request | Response |
|---|---|---|---|---|
| GET | `/api/portfolio/overview` | **신규** | — | `PositionOverview` (Hero + 보유 목록) |
| GET | `/api/portfolio/performance` | **확장** | `?range=1d\|7d\|30d\|90d\|1y\|all` | `{ points[], worstObservedReturn: { pct, peakAt, troughAt } \| null }` |
| GET | `/api/portfolio/risk` | **신규** | — | `RiskRadar` |
| GET | `/api/portfolio/transactions` | 기존 | `?page&limit&symbol` | 목록 |
| POST | `/api/portfolio/transactions` | 기존 | `{ symbol, assetType, transactionType, quantity, price, fee?, note?, transactionDate }` | `201` |
| **POST** | **`/api/portfolio/transactions/preview`** | **신규** | 생성 본문 또는 `{ transactionId, ...변경 }` | `TransactionPreview` |
| PATCH | `/api/portfolio/transactions/:id` | **확장** | `{ quantity?, price?, fee?, note?, transactionDate? }` | `200` |
| DELETE | `/api/portfolio/transactions/:id` | 기존 | — | `200` |

```ts
type PositionOverview = {
  asOf: string;
  hero: { totalValueKrw: number; pnlKrw: number; pnlPct: number; principalKrw: number;
          holdingCount: number; maxWeight: { symbol: string; pct: number } | null; return30dPct: number | null };
  holdings: Array<{ symbol: string; assetType: string; weightPct: number; valueKrw: number; pnlPct: number; avgPrice: number; quantity: number }>;
};
type RiskRadar = {
  asOf: string;
  axes: Array<{ key: 'concentration' | 'volatility' | 'drawdown' | 'newsRisk';
                value: number | null; limit: number; breached: boolean; reasonCode: string | null }>;  // 정확히 4개
};
type TransactionPreview = {
  symbol: string;
  before: { quantity: number; avgPrice: number | null };
  after:  { quantity: number; avgPrice: number | null };
  totalCostKrw: number;
};
```

### 알림 (`/api/investment-notifications` 유지, D5)

| Method | Path | 상태 | 비고 |
|---|---|---|---|
| GET | `/api/investment-notifications` | 기존 → **좁힘** | `signal_update`만. `?cursor&limit` |
| PATCH | `/api/investment-notifications/:id/read` | 기존 | 본인 것만. 남의 id는 404 |
| PATCH | `/api/investment-notifications/read-all` | 기존 → **좁힘** | `signal_update`만 |
| GET | `/api/investment-notifications/unread-count` | 기존 → **좁힘** | `{ count }` |
| GET/PATCH | `/api/investment-notifications/preferences` | **신규** | `{ alertsEnabled: boolean }` |

### 온보딩

| Method | Path | 상태 | 비고 |
|---|---|---|---|
| GET | `/api/onboarding/status` | 기존 → **개정** | 단계 키 `invite` · `first_holding` · `set_plan` |
| POST | `/api/onboarding/steps/first_holding/skip` | **신규** | `204`. 멱등. 다른 단계는 400 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `PerformanceRange`에 `1y`를 **추가만** 한다. 기존 값 응답이 바뀌지 않는다(`worstObservedReturn` 필드 추가는 하위 호환) | Must |
| FR-41 | `RiskRadar.axes`는 **정확히 4개**, 순서 고정. `value: null`이면 `reasonCode`가 있다 | Must |
| FR-42 | 미리보기 · 생성 · 수정 · 삭제의 과매도는 **422 `INSUFFICIENT_QUANTITY`** | Must |
| FR-43 | 거래 쓰기 응답 후 `overview` · `risk` 조회가 **새 값**을 준다(캐시 0건) | Must |
| FR-44 | 금액 필드는 전부 서버 계산 숫자다. 예상 수익 · 목표가 필드 0건 | Must |
| FR-45 | 알림 목록 항목: `{ id, messageCode, params, target: 'coach' \| 'home.weekly-plan', isRead, createdAt }`. 완성 문장 0건 | Must |
| FR-46 | 알림 생성 · 조건 알림 생성 경로(POST)를 **열지 않는다** (B19) | Must |
| FR-47 | 온보딩 `link_account` 키를 **응답에서 없앤다.** 소비처(BFF · FE `OnboardingStepKey`)가 같이 바뀐다 — **BREAKING** | Must |
| FR-48 | Swagger에 신규 · 확장 경로를 문서화한다 | Must |

## Acceptance Criteria

- [ ] `POST /api/coach/messages`가 즉시 201 + `messageId`를 반환한다
- [ ] `GET /stream`이 SSE로 델타를 흘린다
- [ ] **`Last-Event-ID`로 재연결하면 그 이후부터 온다**
- [ ] `complete` 메시지에 붙으면 전문이 한 번에 오고 `done`으로 닫힌다
- [ ] **카드가 `message.card` 단일 이벤트다** (`delta`에 카드 조각 0건)
- [ ] `message.error`에 `fallbackText`가 있다
- [ ] `ping`이 15초 주기로 온다
- [ ] SSE 헤더 3종이 설정되고 **압축이 꺼져 있다**
- [ ] **클라이언트 연결 종료 시 LLM이 취소된다** (서버 로그)
- [ ] 동시 스트림 상한 초과 시 429다
- [ ] 60초 초과 시 `message.error` + 종료
- [ ] 홈 금액 블록 실패 시 `null`이고 `0`이 0건이다
- [ ] 비원화 환산이 있으면 `fxBasisCode`가 있고, 전부 원화면 `null`이다
- [ ] 홈 AI 추천에 `renderable`·`blockedReason`이 있다
- [ ] 홈에 `disclaimer`가 있다
- [ ] 알림이 `messageCode` + `params`이고 완성 문장이 0건이다
- [ ] 홈 응답에 `taxDeadline` · `invoice` · `holdingsPreview` · `alerts[]`가 0건이고 `unreadAlertCount`가 있다
- [ ] 블록별 엔드포인트 3개가 있고 집계와 필드가 동일하다. `tax-deadline` · `invoice`는 404다
- [ ] 메시지 목록이 역순 커서 페이징이다
- [ ] 자동 삭제 경로가 0건이다
- [ ] `treeJson` 16KB 초과 시 413이다
- [ ] 홈에 `Cache-Control: no-store`가 있다
- [ ] Swagger에 SSE 계약이 있다
- [ ] `/api/portfolio/overview` · `/risk` · `/transactions/preview`가 있다
- [ ] `performance?range=1y`가 동작하고 MDD가 있다. 기존 `range` 응답 스냅샷이 유지된다
- [ ] 레이더 축이 정확히 4개다
- [ ] 과매도가 422 `INSUFFICIENT_QUANTITY`다
- [ ] PATCH가 `transactionDate`를 받는다
- [ ] 알림 목록 · 안 읽은 수 · 모두 읽음이 `signal_update`만 다룬다
- [ ] 알림 생성 POST 경로가 0건이다
- [ ] `preferences` GET/PATCH가 동작한다
- [ ] 온보딩 단계 키에 `link_account`가 0건이고 `first_holding` 건너뛰기가 멱등이다

## Dependencies

- **선행:** `SRV-REQ-028`(도메인) · `DB-REQ-021`~`024`
- **소비:** `BFF-REQ-029`(F006 UPSTREAM)
- **규칙:** `ddd-presentation.md` §6(스트리밍) · `bff/.claude/rules/streaming-sse.md`

## Open Questions

- **2단계(POST → GET) vs 1단계(POST 응답이 SSE).** 2단계가 재연결에 유리하고 1단계가 첫 토큰이 빠르다 → **2단계가 기본안**이지만 첫 토큰 1s 예산을 측정해 확인해야 한다(`BFF-REQ-006` Open Question).
- 블록별 엔드포인트 3개가 **인증을 3번** 거친다(2026-09-21 개정). 사용자 ≤10명이면 무시 가능하지만 측정 필요.
- SSE 동시 스트림 상한. 사용자 ≤10명 × 1 = 10이면 넉넉히 20.
- `overview`를 기존 `/holdings` · `/stats` 확장으로 할지 신규로 할지. 기존 두 경로의 응답을 바꾸면 F000 화면이 흔들린다 → **신규가 기본안**, 기존은 그대로 둔다.
- 알림 목록을 `page`에서 `cursor`로 바꾸는 것이 기존 소비처를 깨는지 확인 필요.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 홈 블록 엔드포인트 3개 · `HomeBriefingResult`(세금 · 청구서 · 보유 미리보기 · 알림 목록 삭제, `unreadAlertCount` 추가, `fxBasisCode` nullable) · FR-25 · 온보딩 `nextStep`. 추가: 포지션 계약(`overview` · `performance` `1y`+MDD · `risk` · `transactions/preview` · PATCH 거래일) · 알림 좁힘 + `preferences` · 온보딩 건너뛰기 · FR-40~48. **BREAKING**: 온보딩 `link_account` 키 삭제. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |
