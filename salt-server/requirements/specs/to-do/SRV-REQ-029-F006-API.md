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
| GET | `/api/home` | Y | `HomeBriefingResult` (5블록) |
| GET | `/api/home/blocks/:block` | Y | 블록 1개 (`total-asset`·`weekly-plan`·`coach`·`tax-deadline`·`invoice`) |

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
  onboarding: { complete: boolean; nextStep: 'invite' | 'link_account' | 'set_plan' | null };
  degradedBlocks: string[];

  totalAsset: {
    totalKrw: number | null;
    changeKrw: number | null; changePct: number | null; changeWindow: '1d';
    byAssetClass: Array<{ assetClass: string; valueKrw: number; weight: number }>;
    fxRateUsed: number | null;
    fxBasisCode: 'current_rate';        // 세금은 settlement_rate
    status: 'ok' | 'unavailable';
  };

  weeklyPlan: { weekOf: string; totalKrw: number | null; items: Array<{ symbol: string; amountKrw: number; multiplier: number; bandCode: string }>; status } | null;

  coach: {
    action: string | null; symbol: string | null; score: number | null;
    renderable: boolean; blockedReason: string | null;    // 게이트
    scoreNote: string | null;
    status: 'ok' | 'unavailable';
  } | null;

  taxDeadline: { items: Array<{ assetClass: string; taxable: boolean; daysRemaining: number | null; recommendedDate: string | null }>; status } | null;

  invoice: { window: '180'; interventionPnl: number | null; status } | null;

  holdingsPreview: Array<{ symbol: string; assetClass: string; valueKrw: number; pnlPct: number }>;  // 상위 5
  alerts: Array<{ id: string; kind: 'tax_deadline' | 'signal_update'; messageCode: string; params: Record<string, string|number>; createdAt: string }>;
  disclaimer: string;
};

type CardPayload = {
  renderable: boolean;
  blockedReason: string | null;
  action: string; symbol: string; assetType: string; score: number; scoreNote: string;
  reasons: Array<{ type: string; message: string }>;
  signalTrackRecord: { signalType: string; sample: number; winRate: number; avgReturn: number; maxDrawdown: number; lowSample: boolean } | null;
  failureCases: Array<{ date: string; event: string; outcome: string }>;
  insightId: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 홈 **금액 블록 실패 시 `null`**. `0` 금지 | Must |
| FR-21 | `fxBasisCode: 'current_rate'`를 담아 **세금 기준과 다름**을 알린다 | Must |
| FR-22 | 홈 AI 추천 블록에 **`renderable`·`blockedReason`** 이 있다 | Must |
| FR-23 | `disclaimer`를 홈에도 담는다 | Must |
| FR-24 | 알림은 `messageCode` + `params`다. **완성 문장 0건** | Must |
| FR-25 | `holdingsPreview`는 **상위 5개**다 | Must |
| FR-26 | 블록별 엔드포인트(`/api/home/blocks/:block`)를 제공한다. 웹 스트리밍이 소비한다 | Must |
| FR-27 | 블록별 응답이 집계 응답의 해당 필드와 **동일**하다 | Must |
| FR-28 | 메시지 목록은 **역순 커서 페이징**이다 | Must |
| FR-29 | `DELETE /conversations/:id`는 **사용자 요청 시에만**. 자동 삭제 경로가 없다 | Must |
| FR-30 | `PUT /panel-layout`은 `treeJson` **크기 상한 16KB**. 초과 시 413 | Must |
| FR-31 | 홈을 캐시하지 않는다(`Cache-Control: no-store`) | Must |
| FR-32 | Swagger에 SSE 이벤트 계약을 문서화한다 | Must |

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
- [ ] `fxBasisCode`가 있다
- [ ] 홈 AI 추천에 `renderable`·`blockedReason`이 있다
- [ ] 홈에 `disclaimer`가 있다
- [ ] 알림이 `messageCode` + `params`이고 완성 문장이 0건이다
- [ ] `holdingsPreview`가 5개 이하다
- [ ] 블록별 엔드포인트 5개가 있고 집계와 필드가 동일하다
- [ ] 메시지 목록이 역순 커서 페이징이다
- [ ] 자동 삭제 경로가 0건이다
- [ ] `treeJson` 16KB 초과 시 413이다
- [ ] 홈에 `Cache-Control: no-store`가 있다
- [ ] Swagger에 SSE 계약이 있다

## Dependencies

- **선행:** `SRV-REQ-028`(도메인) · `DB-REQ-021`~`024`
- **소비:** `BFF-REQ-029`(F006 UPSTREAM)
- **규칙:** `ddd-presentation.md` §6(스트리밍) · `bff/.claude/rules/streaming-sse.md`

## Open Questions

- **2단계(POST → GET) vs 1단계(POST 응답이 SSE).** 2단계가 재연결에 유리하고 1단계가 첫 토큰이 빠르다 → **2단계가 기본안**이지만 첫 토큰 1s 예산을 측정해 확인해야 한다(`BFF-REQ-006` Open Question).
- 블록별 엔드포인트 5개가 **인증을 5번** 거친다. 사용자 ≤10명이면 무시 가능하지만 측정 필요.
- SSE 동시 스트림 상한. 사용자 ≤10명 × 1 = 10이면 넉넉히 20.
