---
id: FE-REQ-028
feature: F004
area: fe
kind: API
title: "F004 AI 코치 추천 — 웹 API 호출 계약 정의"
priority: critical
labels: [fe, api, fsd, rsc, polling, llm]
created: 2026-09-09
---

## Summary

코치 화면의 BFF 호출. **조회는 서버 컴포넌트**, mutation·폴링·preflight는 클라이언트다. LLM이 걸린 `explain`은 사용자 액션 기반이어야 한다.

## 호출 배치

| 화면 요소 | 호출 | 방식 | Suspense |
|---|---|---|---|
| 코치 상세 | `GET /api/app/ai-coach/detail` | 서버 컴포넌트 | 안 |
| 성적표 표 | `GET /api/app/coach/scoreboard` | 서버 컴포넌트 | 안 |
| 익절 플랜 | (detail에 포함) | — | — |
| 행동 기록 | (detail에 포함) | — | — |
| 쿨다운 상태 | `GET /api/app/coach/generation-status` | 클라이언트 (폴링) | — |
| 재생성 | `POST /api/app/ai-coach/generate` | mutation → 폴링 | — |
| 피드백 | `POST /api/app/ai-coach/feedback` | mutation | — |
| 주문 전 계산 | `POST /api/app/trade-preflight` | mutation (버튼) | — |
| 성향 설정 | `GET/PATCH /api/app/ai-coach/profile` | 서버 조회 + mutation | — |
| 즉석 해설 | `POST /api/app/ai-coach/explain` | mutation (**사용자 액션만**) | — |

## Requirements

### A. 조회

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 조회는 서버 컴포넌트에서. **토큰을 클라이언트로 내리지 않는다** | Must |
| FR-2 | `detail`과 `scoreboard`를 **병렬**로 띄운다 | Must |
| FR-3 | 조회 함수는 `entities/coach/api/` | Must |
| FR-4 | **`detail`이 6개 소스를 조립한 것**이므로 프론트가 6번 부르지 않는다 | Must |

### B. LLM 경로 — 사용자 액션만

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **`explain`을 자동 호출하지 않는다.** 종목을 지나갈 때마다 부르면 LLM 비용이 든다 | Must |
| FR-11 | `explain`은 사용자가 `[해설 보기]`를 누를 때만 | Must |
| FR-12 | `explain` mutation에 **재시도 0회**, `AbortSignal` 연결 | Must |
| FR-13 | `explain` 타임아웃 20s. 그동안 `Button loading` | Must |
| FR-14 | 실패 시 **규칙 기반 문장이 이미 `detail`에 있으므로** 그것을 보여준다. 오류 화면을 만들지 않는다 | Must |
| FR-15 | 같은 종목·모드로 연속 호출하면 **서버 5분 캐시**가 받는다. 프론트가 추가 캐시하지 않는다 | Must |

### C. 재생성과 폴링

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `generate`는 mutation. **재시도 0회** | Must |
| FR-21 | 202를 받으면 **폴링**을 시작한다: `generation-status` 또는 `detail` 재조회 | Must |
| FR-22 | 폴링 간격 2초, **최대 15회(30초)** | Must |
| FR-23 | **중단 조건 4개**: 완료 · 실패 · 언마운트 · 최대 횟수 | Must |
| FR-24 | 429를 받으면 `retryAfterSeconds`로 타이머를 갱신한다 | Must |
| FR-25 | 폴링 요청에 `AbortSignal` | Must |
| FR-26 | 탭이 백그라운드면 폴링을 멈춘다 | Should |
| FR-27 | 완료 시 `router.refresh()`로 서버 컴포넌트를 재조회한다 | Must |

### D. 피드백

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | mutation. 재시도 0회 | Must |
| FR-31 | **낙관적 갱신** 허용. 실패 시 되돌린다 | Must |
| FR-32 | 성공 시 `detail`의 `feedback` 필드를 갱신한다 | Must |
| FR-33 | `reasonCode`를 함께 보낸다 | Must |

### E. preflight

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | mutation. **버튼 클릭 시** 호출한다. 입력마다 부르지 않는다 | Must |
| FR-41 | 재시도 0회. `AbortSignal` 연결 | Must |
| FR-42 | 결과를 캐시하지 않는다. 입력이 바뀌면 다시 계산이다 | Must |
| FR-43 | **응답에 게이트·차단 필드가 없음을 타입으로 보장**한다. 있으면 컴파일 실패 | Must |

### F. 성향 설정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | PATCH mutation. 재시도 0회 | Must |
| FR-51 | 성공 시 **`router.refresh()`** 로 추천을 재조회한다. 성향이 점수에 영향한다 | Must |
| FR-52 | `defaultMode`·`notificationLevel`이 영속화되므로 폼에 포함한다 | Must |

### G. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `429` → `retryAfterSeconds`로 타이머 갱신. **오류 토스트 0건** | Must |
| FR-61 | `401` → refresh → 실패 시 로그인 | Must |
| FR-62 | `explain` 타임아웃 → 규칙 기반 문장 표시 | Must |
| FR-63 | 블록 조회 실패는 error boundary가 잡는다 | Must |
| FR-64 | HTTP → 문구 매핑은 `shared/i18n` | Must |
| FR-65 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### H. 타입 — 게이트를 타입으로 강제한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 뷰모델 타입은 `packages/core`에서. 프론트 재정의 0건 | Must |
| FR-71 | **`recommendation`을 discriminated union으로 정의**한다: `{ renderable: true; signalTrackRecord: SignalTrackRecord; failureCases: [FailureCase, ...FailureCase[]] } \| { renderable: false; blockedReason: BlockedReason }`. **게이트를 타입이 강제한다** | Must |
| FR-72 | `renderable: false` 분기에서 `signalTrackRecord`에 접근하면 **컴파일 실패** | Must |
| FR-73 | 열거값은 `enum`. 리터럴 union 금지(단 FR-71의 discriminant는 예외) | Must |
| FR-74 | `any` 0건 | Must |
| FR-75 | `scoreNote`·`disclaimer`가 **필수 필드**다. 옵셔널로 바꾸면 컴파일 실패 | Must |

## Acceptance Criteria

- [ ] 조회가 전부 서버 컴포넌트에서 일어난다
- [ ] 토큰이 클라이언트 번들·`localStorage`에 0건이다
- [ ] `detail`과 `scoreboard`가 병렬로 호출된다
- [ ] `detail`이 1회 호출된다 (6번 호출 0건)
- [ ] **`explain`이 자동 호출되지 않는다** (종목 전환 시 요청 0건)
- [ ] `explain`이 버튼 클릭으로만 호출된다
- [ ] `explain` 재시도 0회, `AbortSignal` 연결, 타임아웃 20s
- [ ] `explain` 실패 시 규칙 기반 문장이 표시되고 오류 화면이 0건이다
- [ ] `generate` 재시도 0회
- [ ] 202 후 폴링이 2초 간격 최대 15회다
- [ ] **폴링 중단 조건 4개가 있다**
- [ ] 429가 타이머 갱신이고 오류 토스트가 0건이다
- [ ] 완료 시 `router.refresh()`가 일어난다
- [ ] 피드백이 낙관적 갱신이고 실패 시 되돌아간다
- [ ] preflight가 버튼 클릭으로만 호출되고 캐시가 0건이다
- [ ] **preflight 응답 타입에 게이트·차단 필드가 없다** (있으면 컴파일 실패)
- [ ] 성향 저장 후 `router.refresh()`가 일어난다
- [ ] `defaultMode`·`notificationLevel`이 폼에 있다
- [ ] `429`·`401`·타임아웃이 각각 다르게 처리된다
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델 타입이 `packages/core`에서 온다
- [ ] **`recommendation`이 discriminated union이고 `renderable: false`에서 `signalTrackRecord` 접근이 컴파일 실패한다**
- [ ] `scoreNote`·`disclaimer`를 옵셔널로 바꾸면 컴파일 실패한다
- [ ] `any` 0건

## Dependencies

- **선행:** `BFF-REQ-024`(계약) · `FE-REQ-008`(RSC) · `FE-REQ-009`(FSD)
- **규칙:** `api-convention.md` · `streaming-ssr.md`

## Open Questions

- **FR-71의 discriminated union이 BFF 계약과 일치하는가.** BFF가 `renderable: false`일 때도 `signalTrackRecord: null`을 보내면 타입이 맞지 않는다 → **BFF와 타입을 함께 정의**해야 한다(`BFF-REQ-024` Open Question).
- `failureCases`를 non-empty tuple로 타입 정의하면 런타임 검증이 필요하다. 타입만으로는 보장되지 않는다.
- `explain`을 프리뷰에서 자동 호출하지 않으면 **홈 요약 카드의 해설은 어디서 오는가.** `detail`의 `explanation`(생성 시 저장된 것)을 쓰는 것이 답이다.
