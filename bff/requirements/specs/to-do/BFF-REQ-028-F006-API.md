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

## Summary

대화 SSE 계약과 홈 5블록 뷰모델. **웹은 블록별, 모바일은 집계**이고 두 형태가 같은 함수에서 나온다.

## 엔드포인트

| Method | Path | 용도 | 소비자 |
|---|---|---|---|
| POST | `/api/app/coach/messages` | 메시지 전송 → `messageId` | 웹·모바일 |
| **GET** | **`/api/app/coach/messages/:messageId/stream`** | **SSE** | 웹·모바일 |
| GET | `/api/app/coach/conversations` | 대화 목록 (커서) | 웹·모바일 |
| GET | `/api/app/coach/conversations/:id/messages` | 메시지 목록 (역순 커서) | 웹·모바일 |
| DELETE | `/api/app/coach/conversations/:id` | 삭제 (사용자 요청) | 웹·모바일 |
| GET | `/api/app/home` | **집계 1콜** | 모바일 |
| GET | `/api/app/home/blocks/:block` | 블록 1개 | 웹 |
| GET | `/api/app/alerts` | 알림 2종 | 웹·모바일 |
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
  onboarding: { complete: boolean; nextStep: 'invite' | 'link_account' | 'set_plan' | null };
  degradedBlocks: string[];

  totalAsset: {
    totalKrw: number | null;                  // 실패 시 null. 0 금지
    changeKrw: number | null; changePct: number | null; changeWindow: '1d';
    byAssetClass: Array<{ assetClass: 'crypto' | 'kr_stock' | 'us_stock'; valueKrw: number; weight: number }>;
    fxRateUsed: number | null;
    fxBasisCode: 'current_rate';              // 세금은 settlement_rate — 툴팁 근거
    status: 'ok' | 'unavailable';
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

  taxDeadline: {
    items: Array<{ assetClass: string; taxable: boolean; daysRemaining: number | null; recommendedDate: string | null; noteCode: string }>;
    status: 'ok' | 'unavailable';
  } | null;

  invoice: { window: '180'; interventionPnl: number | null; status: 'ok' | 'unavailable' } | null;

  holdingsPreview: Array<{ symbol: string; assetClass: string; valueKrw: number; pnlPct: number }>;  // 상위 5
  alerts: Array<{ id: string; kind: 'tax_deadline' | 'signal_update'; messageCode: string; params: Record<string, string|number>; isRead: boolean; createdAt: string }>;
  disclaimer: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **블록 순서를 계약으로 고정**한다: 총자산 → 적립 → 추천 → 세금 → 청구서. 화면이 순서를 바꾸지 않는다 | Must |
| FR-21 | **금액 실패 시 `null`.** `0` 금지 | Must |
| FR-22 | 블록마다 `status`가 있고 `degradedBlocks[]`가 최상위에 있다 | Must |
| FR-23 | AI 추천에 **`renderable`·`blockedReason`·`scoreNote`** 가 있다 | Must |
| FR-24 | **`fxBasisCode`가 있다.** 세금 기준과 다름을 화면이 알린다 | Must |
| FR-25 | `disclaimer`가 있다 | Must |
| FR-26 | 알림 `kind`가 **2종**이고 `messageCode` + `params`다 | Must |
| FR-27 | `holdingsPreview`가 **5개 이하**다 | Must |
| FR-28 | 블록별 엔드포인트 응답이 집계의 해당 필드와 **동일**하다 | Must |
| FR-29 | 메시지 목록이 **역순 커서 페이징**이다 | Must |
| FR-30 | 홈에 `Cache-Control: no-store` | Must |
| FR-31 | 뷰모델·SSE 타입을 `packages/core`로 공유 | Should |
| FR-32 | `treeJson` 16KB 초과 시 413 | Must |

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
- [ ] **홈 블록 순서가 계약으로 고정된다**
- [ ] 금액 실패 시 `null`이고 `0`이 0건이다
- [ ] 블록마다 `status`가 있고 `degradedBlocks[]`가 있다
- [ ] AI 추천에 게이트 필드와 `scoreNote`가 있다
- [ ] `fxBasisCode`가 있다
- [ ] `disclaimer`가 있다
- [ ] 알림 `kind`가 2종이고 `messageCode` + `params`다
- [ ] `holdingsPreview`가 5개 이하다
- [ ] 블록별 응답이 집계와 동일하다
- [ ] 메시지 목록이 역순 커서 페이징이다
- [ ] 홈에 `Cache-Control: no-store`가 있다
- [ ] `treeJson` 16KB 초과 시 413이다

## Dependencies

- **선행:** `BFF-REQ-027` · `SRV-REQ-029`
- **소비:** `FE-REQ-032`(F006 API) · `RN-REQ-026`(F006 API)

## Open Questions

- SSE 타입을 `packages/core`에 두려면 BFF가 그 패키지를 참조해야 한다(`BFF-REQ-006` Open Question).
- 블록별 엔드포인트 5개가 인증을 5번 거친다. 측정 후 판단.
- `CardViewModel`을 F004의 `recommendation`과 **같은 타입**으로 쓸 수 있는가. 그러면 화면이 카드 컴포넌트를 재사용한다 → **같은 타입이 맞다.**
