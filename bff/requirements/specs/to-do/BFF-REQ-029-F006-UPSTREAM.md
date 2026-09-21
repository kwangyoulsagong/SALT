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

> **2026-09-21 개정.** `ADR-002` — 홈은 서버 3블록, `fxBasisCode` 누락 규칙(FR-33) 개정. 서버에 **이미 있는** 거래 쓰기 · 알림 읽음 경로와 신규 포지션 · 미리보기 · 온보딩 건너뛰기 · 알림 설정 경로의 호출 계약을 추가했다(§2026-09-21 호출). 근거: 스토리보드 갭 감사 D5 · D9 · B12 · B13 · B14.

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
| `markAlertRead` · `markAllAlertsRead` | `PATCH /api/investment-notifications/:id/read` · `/read-all` | 400ms | **0회** *(2026-09-21)* |
| `unreadAlertCount` | `GET /api/investment-notifications/unread-count` | 200ms | 1회 *(2026-09-21)* |
| `alertPreferences` GET/PATCH | `GET/PATCH /api/investment-notifications/preferences` | 400ms | GET 1회 / PATCH 0회 *(2026-09-21)* |
| `positionOverview` | `GET /api/portfolio/overview` | 400ms | 1회 *(2026-09-21)* |
| `positionRisk` | `GET /api/portfolio/risk` | 500ms | 1회 *(2026-09-21)* |
| `performance` | `GET /api/portfolio/performance?range=7d\|30d\|90d\|1y` | 500ms | 1회 *(개정 2026-09-21)* |
| `listTransactions` | `GET /api/portfolio/transactions` | 400ms | 1회 *(2026-09-21)* |
| `createTransaction` · `updateTransaction` · `deleteTransaction` | `POST` · `PATCH /:id` · `DELETE /:id` `/api/portfolio/transactions` | 600ms | **0회** *(2026-09-21)* |
| `previewTransaction` | `POST /api/portfolio/transactions/preview` | 400ms | 1회(읽기 전용) *(2026-09-21)* |
| `skipOnboardingStep` | `POST /api/onboarding/steps/first_holding/skip` | 400ms | 0회 *(2026-09-21)* |
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
| FR-20 | 서버 `GET /api/home`이 **이미 조립**한다. BFF가 블록 수만큼 부르지 않는다 | Must |
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
| `totalAsset.fxBasisCode` | 환율 기준 툴팁 *(개정 2026-09-21 — 세금 비교 삭제)* |
| `portfolio/risk.axes[]`(4개) | 레이더 *(2026-09-21)* |
| `transactions/preview.before/after` | 평단 전후 — **BFF가 계산하지 않는 근거** *(2026-09-21)* |
| `onboarding.steps[].key` | `first_holding` — **BREAKING** *(2026-09-21)* |
| `coach.renderable` | **게이트** |
| `alerts[].messageCode`·`params` | 알림 문구 |
| `disclaimer` | 면책 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **`message.card`에 게이트 필드가 없으면 그 이벤트를 전달하지 않는다.** 게이트 없이 카드를 내보내는 것이 가장 위험하다 | Must |
| FR-31 | `coach.renderable`이 없으면 그 블록을 `unavailable`로 처리한다 | Must |
| FR-32 | `disclaimer`가 없으면 홈을 `unavailable`로 처리한다 | Must |
| FR-33 | 총자산에 **비원화 환산(`fxRateUsed` ≠ null)이 있는데** `fxBasisCode`가 없으면 총자산 블록을 `unavailable`로 처리한다. 전부 원화(`fxRateUsed = null`)면 `fxBasisCode = null`이 정상이다. **개정 2026-09-21** (ADR-002 — 원화 전용일 때 홈 총자산이 항상 죽는 것을 막는다) | Must |
| FR-34 | 계약 스냅샷 테스트를 둔다. **SSE 이벤트와 게이트 필드를 특히 고정**한다 | Must |

## 2026-09-21 호출 — 포지션 · 거래 · 알림 · 온보딩

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 거래 쓰기(`POST/PATCH/DELETE`)는 **재시도 0회**. 타임아웃 시 결과를 모르므로 화면에 "확인 필요"를 알리고 목록을 다시 조회하게 한다 **(기본안 — 감사 문서 B14)** | Must |
| FR-51 | 미리보기는 서버가 쓰지 않으므로 **1회 재시도 가능** | Must |
| FR-52 | 포지션 뷰모델은 `overview` · `risk`를 **병렬**로 부르고 `allSettled`로 섹션 `status`를 만든다 **(기본안 — 감사 문서 B13)** | Must |
| FR-53 | `risk.axes`가 4개가 아니면 레이더 섹션을 `unavailable`로 처리한다 — 축이 빠진 레이더는 거짓 모양이다 | Must |
| FR-54 | `performance`의 `range` 매핑(`1w→7d` · `1m→30d` · `3m→90d` · `1y→1y`) 외 값은 BFF가 400으로 막는다 | Must |
| FR-55 | 알림 읽음 · 모두 읽음은 **재시도 0회**(멱등이지만 필요 없다). 서버 404를 그대로 전달한다 | Must |
| FR-56 | 서버 온보딩 응답에 `link_account`가 오면(구버전 서버) **`first_holding`으로 바꾸지 않고** 계약 스냅샷 테스트를 실패시킨다 — 조용한 번역 금지 | Must |
| FR-57 | 계약 스냅샷에 `risk.axes`(4) · 미리보기 `before/after` · 알림 `target` · 온보딩 단계 키를 **추가**한다 | Must |

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
- [ ] 홈이 서버를 **1회** 부른다 (블록별 호출 0건)
- [ ] 블록별 엔드포인트가 1:1 프록시다
- [ ] 서버 블록 `status`가 그대로 전달된다
- [ ] 서버 실패 시 `unavailable`이고 BFF 캐시가 0건이다
- [ ] **`message.card`에 게이트 필드가 없으면 전달되지 않는다**
- [ ] `coach.renderable` 없으면 블록이 `unavailable`이다
- [ ] `disclaimer` 없으면 홈이 `unavailable`이다
- [ ] **비원화 환산이 있는데 `fxBasisCode`가 없으면 총자산 블록이 `unavailable`이고, 전부 원화면 정상이다**
- [ ] 계약 스냅샷 테스트가 SSE 이벤트와 게이트 필드를 고정한다
- [ ] BFF에 LLM 호출·토큰 변형·대화 저장·홈 계산 코드가 0건이다
- [ ] 주문 중계 경로가 0건이다
- [ ] 거래 쓰기 재시도가 0회이고 타임아웃 시 "확인 필요" 코드가 나간다
- [ ] 포지션 `overview` · `risk`가 병렬이다
- [ ] 레이더 축이 4개가 아니면 섹션이 `unavailable`이다
- [ ] `range` 매핑 외 값이 400이다
- [ ] 계약 스냅샷에 레이더 · 미리보기 · 알림 `target` · 온보딩 키가 있다

## Dependencies

- **선행:** `SRV-REQ-029`(서버 계약)
- **짝:** `BFF-REQ-027` · `028` · `030`
- **규칙:** `backend-integration.md` · `streaming-sse.md`

## Open Questions

- Node/Express에서 **SSE 스트림 파이프 시 backpressure**를 어떻게 다룰지. 클라이언트가 느리면 BFF 메모리가 찬다 → `pipeline()`으로 처리하는 것이 기본안.
- `ping`을 서버 것을 통과시킬지 BFF가 생성할지. **통과가 단순**하지만 서버-BFF 구간이 끊기면 BFF가 알아야 한다.
- 서버가 홈을 조립하므로 **BFF 홈 함수가 얇아진다.** 블록 함수 3개(2026-09-21 개정)를 BFF에 둘 이유가 있는지 재검토(`BFF-REQ-027` Open Question).
- 거래 쓰기 타임아웃(FR-50) 후 중복을 막으려면 요청 id(멱등 키)를 서버가 받아야 한다. 수기 입력 빈도가 낮아 **지금은 "확인 필요" 안내가 기본안**.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: FR-20(블록 수), FR-33(원화 전용이면 `fxBasisCode = null` 정상), 계약 의존 표. 추가: 호출 맵 11행(알림 읽음 · 안 읽은 수 · 설정, 포지션 · 성과 `1y`, 거래 쓰기 · 미리보기, 온보딩 건너뛰기)과 FR-50~57(B13 · B14 · D5 · B12). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |
