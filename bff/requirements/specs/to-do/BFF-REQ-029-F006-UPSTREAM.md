---
id: BFF-REQ-029
feature: F006
area: bff
kind: UPSTREAM
title: "F006 코치 대화 & 3탭 IA — 서버 호출 계약 정의 (SSE 프록시 · 홈)"
priority: critical
labels: [bff, upstream, sse-proxy, cancellation, home]
created: 2026-09-09
---

## Summary

BFF가 서버 SSE를 **프록시**하고 취소를 전파한다. 홈은 서버 `homebriefing`이 조립한 것을 받는다.

## 호출 맵

| BFF 함수 | 서버 호출 | 타임아웃 | 재시도 |
|---|---|---|---|
| `postMessage` | `POST /api/coach/messages` | 1s | **0회** |
| **`streamMessage`** | **`GET /api/coach/messages/:id/stream`** | **60s** (스트림 상한) | **0회** |
| `listConversations` | `GET /api/coach/conversations` | 400ms | 1회 |
| `listMessages` | `GET /api/coach/conversations/:id/messages` | 500ms | 1회 |
| `deleteConversation` | `DELETE /api/coach/conversations/:id` | 600ms | 0회 |
| `home` | `GET /api/home` | **600ms** | 1회 |
| `homeBlock` | `GET /api/home/blocks/:block` | 300ms | 1회 |
| `alerts` | `GET /api/investment-notifications` | 400ms | 1회 |
| `panelLayout` GET/PUT | `GET/PUT /api/panel-layout` | 400ms | GET 1회 / PUT 0회 |

## SSE 프록시 — 취소 전파가 핵심

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 서버 SSE 응답을 **스트림으로 파이프**한다. 버퍼링하지 않는다 | Must |
| FR-2 | **클라이언트 연결 종료 시 서버 요청을 끊는다**: `req.on('close')` → `upstream.destroy()` | Must |
| FR-3 | 끊지 않으면 **서버의 LLM 호출이 계속 돈다.** 유령 호출이 CPU와 비용을 먹는다 | Must |
| FR-4 | `Last-Event-ID` 헤더를 서버로 전달한다 | Must |
| FR-5 | **재시도 0회.** 스트림 재시도는 중복 생성 위험이다(서버가 멱등이지만 BFF가 시도할 이유가 없다) | Must |
| FR-6 | 스트림 타임아웃 60s. 서버 상한과 같다 | Must |
| FR-7 | 서버가 `message.error`를 보내면 그대로 전달한다. **BFF가 재시도하거나 문구를 만들지 않는다** | Must |
| FR-8 | **압축을 끈다.** BFF와 서버 구간, BFF와 클라이언트 구간 둘 다 | Must |
| FR-9 | 서버가 보내는 `ping`을 그대로 통과시킨다. 서버-BFF 구간 유휴도 방지된다 | Should |
| FR-10 | 동시 스트림 수를 제한한다. 초과 시 429 | Must |
| FR-11 | 스트림 본문을 **로깅하지 않는다** | Must |

## 홈

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 서버 `GET /api/home`이 **이미 조립**한다. BFF가 5번 부르지 않는다 | Must |
| FR-21 | 웹 블록별 엔드포인트는 서버 블록 엔드포인트를 **1:1 프록시**한다 | Must |
| FR-22 | 서버가 준 블록별 `status`·`degradedBlocks`를 그대로 전달한다 | Must |
| FR-23 | 서버 호출이 실패하면 **전체 `unavailable`** 이다. BFF가 캐시하지 않는다 | Must |
| FR-24 | 타임아웃 600ms. 초과 시 `unavailable` | Must |
| FR-25 | 홈을 캐시하지 않는다 | Must |

## 계약 의존

| 서버 필드 | 변경 시 영향 |
|---|---|
| SSE 이벤트 이름·페이로드 | 대화 화면 전체 |
| `message.card`의 게이트 필드 4개 | **정책.** 누락 시 화면이 게이트를 우회한다 |
| `message.error.fallbackText` | 실패 시 빈 화면 방지 |
| `done.explanationSource` | 규칙 기반 배지 |
| 홈 블록별 `status` | 부분 실패 격리 |
| `totalAsset.fxBasisCode` | 세금 기준 구분 툴팁 |
| `coach.renderable` | **게이트** |
| `alerts[].messageCode`·`params` | 알림 문구 |
| `disclaimer` | 면책 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **`message.card`에 게이트 필드가 없으면 그 이벤트를 전달하지 않는다.** 게이트 없이 카드를 내보내는 것이 가장 위험하다 | Must |
| FR-31 | `coach.renderable`이 없으면 그 블록을 `unavailable`로 처리한다 | Must |
| FR-32 | `disclaimer`가 없으면 홈을 `unavailable`로 처리한다 | Must |
| FR-33 | `fxBasisCode`가 없으면 총자산 블록을 `unavailable`로 처리한다. **기준을 모르는 금액을 보여주면 안 된다** | Must |
| FR-34 | 계약 스냅샷 테스트를 둔다. **SSE 이벤트와 게이트 필드를 특히 고정**한다 | Must |

## 하지 않는 것

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **LLM을 직접 부르지 않는다** | Must |
| FR-41 | 토큰을 변형·검사하지 않는다. 후처리는 서버가 한다 | Must |
| FR-42 | 대화를 저장하지 않는다 | Must |
| FR-43 | 홈을 계산하지 않는다 | Must |
| FR-44 | 주문을 중계하지 않는다 | Must |

## Acceptance Criteria

- [ ] SSE가 스트림으로 파이프되고 버퍼링이 0건이다
- [ ] **클라이언트 종료 시 서버 요청이 끊기고 LLM이 취소된다** (서버 로그 확인)
- [ ] `Last-Event-ID`가 전달된다
- [ ] 스트림 재시도가 0건이다
- [ ] 스트림 타임아웃이 60s다
- [ ] `message.error`가 그대로 전달되고 BFF 재시도가 0건이다
- [ ] **양쪽 구간 압축이 꺼져 있다**
- [ ] `ping`이 통과된다
- [ ] 동시 스트림 상한 초과 시 429다
- [ ] 스트림 본문이 로그에 0건이다
- [ ] 홈이 서버를 **1회** 부른다 (5번 호출 0건)
- [ ] 블록별 엔드포인트가 1:1 프록시다
- [ ] 서버 블록 `status`가 그대로 전달된다
- [ ] 서버 실패 시 `unavailable`이고 BFF 캐시가 0건이다
- [ ] **`message.card`에 게이트 필드가 없으면 전달되지 않는다**
- [ ] `coach.renderable` 없으면 블록이 `unavailable`이다
- [ ] `disclaimer` 없으면 홈이 `unavailable`이다
- [ ] **`fxBasisCode` 없으면 총자산 블록이 `unavailable`이다**
- [ ] 계약 스냅샷 테스트가 SSE 이벤트와 게이트 필드를 고정한다
- [ ] BFF에 LLM 호출·토큰 변형·대화 저장·홈 계산 코드가 0건이다
- [ ] 주문 중계 경로가 0건이다

## Dependencies

- **선행:** `SRV-REQ-029`(서버 계약)
- **짝:** `BFF-REQ-027` · `028` · `030`
- **규칙:** `backend-integration.md` · `streaming-sse.md`

## Open Questions

- Node/Express에서 **SSE 스트림 파이프 시 backpressure**를 어떻게 다룰지. 클라이언트가 느리면 BFF 메모리가 찬다 → `pipeline()`으로 처리하는 것이 기본안.
- `ping`을 서버 것을 통과시킬지 BFF가 생성할지. **통과가 단순**하지만 서버-BFF 구간이 끊기면 BFF가 알아야 한다.
- 서버가 홈을 조립하므로 **BFF 홈 함수가 얇아진다.** 블록 함수 5개를 BFF에 둘 이유가 있는지 재검토(`BFF-REQ-027` Open Question).
