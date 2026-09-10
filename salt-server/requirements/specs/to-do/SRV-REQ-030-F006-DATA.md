---
id: SRV-REQ-030
feature: F006
area: srv
kind: DATA
title: "F006 코치 대화 & 3탭 IA — 컨텍스트·워커·LLM 스트리밍 연동 정의"
priority: critical
labels: [ddd, infrastructure, sse, llm-streaming, homebriefing, fx]
created: 2026-09-09
---

## Summary

`coach`에 대화를 추가하고 `homebriefing` 조합 컨텍스트를 신설한다. 인프라 작업의 핵심은 **LLM 스트리밍 클라이언트**와 **취소 전파**다.

## 컨텍스트 구조

```
src/coach/                                   (F004 에서 만든 것에 추가)
├── domain/
│   ├── CoachConversation · CoachMessage
│   ├── ConversationStore · MessageStore
│   ├── StreamingExplainerPort            ← 신규. 토큰 스트림
│   └── policy/{contextRouting,promptGuard,answerGuard}
├── application/
│   ├── AnswerCoachMessage · ListConversations · ListMessages · DeleteConversation
│   └── api/  (F004 의 BiasLabelQuery 등에 추가)
├── infrastructure/
│   ├── PrismaConversationStore · PrismaMessageStore
│   ├── GeminiStreamingClient             ← 신규
│   └── ContextAssembler                  ← 각 컨텍스트 공개 API 를 모은다
└── presentation/    coach.routes(+SSE) · controller

src/homebriefing/                            (신규 조합 컨텍스트)
├── application/
│   ├── BuildHomeBriefing · BuildHomeBlock
│   └── (Aggregate 없음)
├── infrastructure/
│   └── 각 컨텍스트 공개 API 어댑터 5개
└── presentation/    home.routes · controller

src/panel/                                   (또는 coach 안에)
└── PanelLayout CRUD
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 대화를 **`coach` 컨텍스트에 추가**한다. 별도 컨텍스트를 만들지 않는다 — 코치의 일부다 | Must |
| FR-2 | `homebriefing`을 **조합 컨텍스트**로 신설한다. **Aggregate 없이 `application`(+`presentation`)만** | Must |
| FR-3 | `homebriefing`이 5개 컨텍스트의 **공개 API만** 부른다. Prisma 직접 읽기 0건 | Must |
| FR-4 | `PanelLayout`은 작으므로 `coach` 안 또는 별도 소형 컨텍스트. **판단은 구현 시** | Should |
| FR-5 | `domain`이 `@prisma/client`·`express`·`axios`를 import하지 않는다 | Must |

## LLM 스트리밍 클라이언트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `StreamingExplainerPort`를 `domain`에 선언한다. **시그니처에 Gemini 타입이 노출되지 않는다** | Must |
| FR-11 | Port는 `AsyncIterable<string>` 또는 콜백으로 토큰을 준다. **SDK 타입을 그대로 내보내지 않는다** | Must |
| FR-12 | **`AbortSignal`을 받는다.** 클라이언트 연결 종료 시 취소한다 | Must |
| FR-13 | 타임아웃 60초. 초과 시 스트림을 끊고 `LLM_TIMEOUT` | Must |
| FR-14 | **재시도하지 않는다.** 스트리밍 중 재시도는 앞부분이 중복된다 | Must |
| FR-15 | 실패 시 **규칙 기반 문장**을 `fallbackText`로 준다 | Must |
| FR-16 | **프롬프트·응답을 원문 로깅하지 않는다.** `tokenCount`·`durationMs`·`errorCode`만 | Must |
| FR-17 | LLM 호출은 **트랜잭션 밖**이다 | Must |
| FR-18 | 동시 스트림 상한을 둔다. 초과 시 429 | Must |

## 취소 전파 — 유령 호출을 막는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `presentation`이 `req.on('close')`를 감지해 **`AbortController.abort()`** 를 호출한다 | Must |
| FR-21 | `application`이 그 신호를 `StreamingExplainerPort`에 전달한다 | Must |
| FR-22 | 취소되면 메시지 상태를 **`complete`(부분 저장분) 또는 `failed`** 로 마감한다. `streaming`으로 두지 않는다 | Must |
| FR-23 | 취소 후 **advisory lock을 해제**한다. 안 하면 재연결이 막힌다 | Must |
| FR-24 | 취소 건수를 측정한다. **높으면 사용자가 답을 기다리지 않는다는 신호**다 | Must |

## 부분 저장

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **2초 또는 500자** 중 먼저 오는 것마다 저장한다 | Must |
| FR-31 | **트랜잭션 없이 단일 UPDATE**. 스트리밍 동안 트랜잭션을 잡지 않는다 | Must |
| FR-32 | 저장 실패가 스트리밍을 중단시키지 않는다. 로그만 남긴다 | Must |
| FR-33 | 완료 시 최종 `content`·`status`·`tokenCount`·`completedAt`을 **한 트랜잭션**에서 저장하고 `messageCount`·`lastMessageAt`을 갱신한다 | Must |

## `ContextAssembler`

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 각 컨텍스트의 공개 API를 모아 프롬프트 컨텍스트를 만든다: `portfolio` · `plan` · `tax` · `invoice` · `indicator` · `coach`(자기 추천) | Must |
| FR-41 | **`policy/contextRouting`이 정한 것만** 부른다. 전부 부르지 않는다 | Must |
| FR-42 | 필요한 것들을 **병렬**로 부른다 | Must |
| FR-43 | 하나가 실패하면 **그 부분만 빼고** 진행한다 | Must |
| FR-44 | 각 호출에 타임아웃(500ms). 컨텍스트 조립이 첫 토큰 예산(1s)을 먹으면 안 된다 | Must |
| FR-45 | 조립 결과를 **저장하지 않는다.** 프롬프트에만 쓴다 | Must |

## `homebriefing` 조합

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 5블록을 **병렬**로 조회한다 | Must |
| FR-51 | **부분 실패를 격리**한다. 하나가 실패해도 나머지를 내려준다 | Must |
| FR-52 | 각 블록에 타임아웃을 둔다 | Must |
| FR-53 | 블록별 엔드포인트와 집계 엔드포인트가 **같은 함수**를 쓴다 | Must |
| FR-54 | **캐시하지 않는다** | Must |
| FR-55 | 조합 컨텍스트에 **비즈니스 규칙을 담지 않는다.** 규칙이 생기면 해당 컨텍스트로 내린다 | Must |
| FR-56 | 트랜잭션을 열지 않는다 | Must |

## 환율 워커 확장

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `fx-rate.worker`가 **`kind: 'current'`를 추가로 수집**한다 | Must |
| FR-61 | `current`는 **1시간마다**. `settlement_base`는 일 1회 | Must |
| FR-62 | `current`가 없으면 총자산이 `degraded`다. **`settlement_base`로 폴백하지 않는다** | Must |
| FR-63 | 환율 소스의 호출 한도를 확인하고 주기를 조정한다 | Must |

## 정리 워커

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | **서버 기동 시 `streaming` 잔여 메시지를 `failed`로 정리**한다. 기동 훅에서 1회 | Must |
| FR-71 | 대화 아카이브 워커(선택): 마지막 메시지 90일 경과 시 `archivedAt` 설정. **배치로 나눠 UPDATE** | Should |
| FR-72 | **자동 삭제 0건** | Must |
| FR-73 | `CoachMessage` row 수 추이를 측정한다. 가장 빠르게 는다 | Must |

## Acceptance Criteria

- [ ] 대화가 `coach` 컨텍스트 안에 있다
- [ ] `homebriefing`이 Aggregate 없이 `application`만 갖는다
- [ ] `homebriefing`이 공개 API만 부른다 (Prisma 직접 읽기 0건)
- [ ] `grep -rn "@prisma/client\|express\|axios" src/{coach,homebriefing}/domain` = 0
- [ ] `StreamingExplainerPort`에 Gemini 타입이 0건이다
- [ ] Port가 `AbortSignal`을 받는다
- [ ] LLM 타임아웃 60초, **재시도 0회**
- [ ] 실패 시 `fallbackText`가 온다
- [ ] **프롬프트·응답 원문 로깅이 0건이다**
- [ ] LLM 호출이 트랜잭션 밖이다
- [ ] 동시 스트림 상한이 있다
- [ ] **클라이언트 종료 시 `AbortController.abort()`가 호출된다** (서버 로그)
- [ ] 취소 후 상태가 `complete`/`failed`로 마감된다 (`streaming` 잔여 0건)
- [ ] **취소 후 advisory lock이 해제된다** (재연결 가능 확인)
- [ ] 취소 건수가 측정된다
- [ ] 부분 저장이 2초/500자이고 트랜잭션이 없다
- [ ] 저장 실패가 스트리밍을 중단시키지 않는다
- [ ] 완료 저장이 한 트랜잭션에서 `messageCount`·`lastMessageAt`을 갱신한다
- [ ] `ContextAssembler`가 라우팅이 정한 것만 병렬로 부른다
- [ ] 컨텍스트 일부 실패 시 진행된다
- [ ] 각 컨텍스트 호출에 500ms 타임아웃이 있다
- [ ] 조립 결과가 저장되지 않는다
- [ ] 홈 5블록이 병렬이고 부분 실패가 격리된다
- [ ] 블록별·집계 엔드포인트가 같은 함수를 쓴다
- [ ] 홈이 캐시되지 않는다
- [ ] `homebriefing`에 비즈니스 규칙이 0건이다
- [ ] `fx-rate.worker`가 `current`를 1시간마다 수집한다
- [ ] **`current` 없으면 `settlement_base`로 폴백하지 않는다**
- [ ] **서버 기동 시 `streaming` 잔여가 정리된다**
- [ ] 자동 삭제가 0건이다
- [ ] `CoachMessage` row 수 추이가 측정된다

## Dependencies

- **선행:** `SRV-REQ-028`(도메인) · `SRV-REQ-026`(F004 `coach` 인프라) · `DB-REQ-021`~`024`
- **소비:** 각 컨텍스트 공개 API 5개
- **규칙:** `ddd-infrastructure.md` · `workers-external.md`

## Open Questions

- **Gemini 스트리밍 API가 `AbortSignal`을 지원하는지** 확인이 필요하다. 안 하면 취소가 소켓 종료로만 가능하고 유령 호출이 남을 수 있다.
- 컨텍스트 조립 500ms 타임아웃이 **첫 토큰 1s 예산 안에 들어오는가.** 조립 500ms + LLM 첫 토큰이면 이미 넘을 수 있다 → **조립을 더 짧게** 하거나 예산을 조정해야 한다.
- `PanelLayout`을 어느 컨텍스트에 둘지. 도메인이 없으므로 **`shared/presentation`에 두는 것도** 방법이지만 사용자별 데이터라 애매하다.
- `current` 환율 1시간 주기와 호출 한도.
