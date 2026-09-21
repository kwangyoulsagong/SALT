---
id: FE-REQ-032
feature: F006
area: fe
kind: API
title: "F006 코치 대화 & 3탭 IA — 웹 API 호출 계약 정의 (SSE · 블록별 조회)"
priority: critical
labels: [fe, api, fsd, sse, rsc, streaming]
created: 2026-09-09
---

> **2026-09-21 개정.** `ADR-002` — 홈 블록 조회 3개(세금 · 청구서 삭제), 홈 알림 목록 조회 삭제(벨 배지는 안 읽은 수). 포지션 · 거래 · 알림 · 설정 · 온보딩 건너뛰기 호출을 추가했다(§G). 근거: 스토리보드 갭 감사 D5 · D6 · D9 · B12 · B13 · B14.

## Summary

홈은 **서버 컴포넌트가 블록별로 조회**하고 스트리밍한다. 대화는 **클라이언트가 SSE를 구독**한다. 이 둘의 경계가 이 REQ의 핵심이다.

## 호출 배치

| 화면 요소 | 호출 | 방식 | Suspense |
|---|---|---|---|
| 홈 총자산 | `GET /api/app/home/blocks/total-asset` | 서버 컴포넌트 | 안 |
| 홈 적립 | `.../weekly-plan` | 서버 컴포넌트 | 안 |
| 홈 추천 | `.../coach` | 서버 컴포넌트 | 안 |
| ~~홈 세금 · 청구서~~ | 삭제 2026-09-21 (ADR-002) | — | — |
| 헤더 벨 | `GET /api/app/alerts/unread-count` | 클라이언트 쿼리 *(개정 2026-09-21 — 홈 알림 목록 삭제, D6)* | — |
| 알림 화면 | `GET /api/app/alerts` · `PATCH .../:id/read` · `.../read-all` | 서버 컴포넌트 + mutation *(2026-09-21)* | 안 |
| 포지션 | `GET /api/app/portfolio` · `/performance?range` | 서버 컴포넌트 + 기간은 클라이언트 쿼리 *(2026-09-21)* | 섹션별 |
| 거래 | `GET/POST /api/app/portfolio/transactions` · `POST .../preview` · `PATCH/DELETE .../:id` | 조회 + mutation *(2026-09-21)* | — |
| 설정 | `GET /api/app/settings` · 그룹별 쓰기 | 서버 컴포넌트 + mutation *(2026-09-21)* | 그룹별 |
| 온보딩 건너뛰기 | `POST /api/app/onboarding/steps/first-holding/skip` | mutation *(2026-09-21)* | — |
| 온보딩 상태 | `GET /api/app/onboarding/status` | 서버 컴포넌트 | 밖 |
| 대화 목록 | `GET /api/app/coach/conversations` | 서버 컴포넌트 | 안 |
| 메시지 목록 | `GET /api/app/coach/conversations/:id/messages` | 서버 컴포넌트 + 클라이언트 페이징 | 안 |
| **메시지 전송** | `POST /api/app/coach/messages` | **mutation** | — |
| **SSE 구독** | `GET /api/app/coach/messages/:id/stream` | **클라이언트 스트림** | — |
| 대화 삭제 | `DELETE /api/app/coach/conversations/:id` | mutation | — |
| 패널 배치 | `GET/PUT /api/app/panel-layout` | 서버 조회 + mutation | — |

## Requirements

### A. 홈 — 블록별 서버 컴포넌트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 블록 3개를 **서버 컴포넌트에서 각각** 조회하고 각각 Suspense로 감싼다. **개정 2026-09-21** (D6) | Must |
| FR-2 | **병렬**로 띄운다. `await` 연쇄 0건 | Must |
| FR-3 | **토큰을 클라이언트로 내리지 않는다** | Must |
| FR-4 | 온보딩 상태는 **Suspense 밖**에서 `await`한다. 미완료면 블록을 렌더하지 않는다 | Must |
| FR-5 | 블록 실패는 `BlockBoundary`의 error boundary가 잡는다 | Must |
| FR-6 | **`FE-REQ-008` FR-31의 측정 게이트가 적용된다.** 블록별 호출이 서버 부하를 3배로 만들면 집계 1콜로 되돌린다 | Must |

### B. SSE — 클라이언트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 스트림 구독은 **클라이언트 컴포넌트**에서만. 서버 컴포넌트에서 스트림을 열지 않는다 | Must |
| FR-11 | **`EventSource`는 헤더를 붙일 수 없다.** 인증 방식을 확정한다: ① **쿠키**(권장) ② `fetch` + `ReadableStream`으로 직접 구현 | Must |
| FR-12 | `POST /messages`는 mutation. **재시도 0회** — 재시도하면 메시지가 두 개 생긴다 | Must |
| FR-13 | 201 응답의 `messageId`로 스트림을 연다 | Must |
| FR-14 | 언마운트·취소 시 스트림을 닫는다 | Must |
| FR-15 | 재연결은 브라우저가 자동으로 한다(`EventSource`). 직접 구현이면 **백오프**를 둔다 | Must |
| FR-16 | 재연결 3회 실패 시 끊고 재시도 버튼 | Must |
| FR-17 | 스트림 완료 후 **메시지 목록 쿼리를 무효화**하거나 로컬 상태에 반영한다 | Must |

### C. 메시지 목록 페이징

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 첫 페이지는 **서버 컴포넌트**가 조회한다 | Must |
| FR-21 | 위로 스크롤 시 추가 페이지는 **클라이언트 `useInfiniteQuery`** 로 | Must |
| FR-22 | 커서 기반. offset 0건 | Must |
| FR-23 | 서버 컴포넌트가 준 첫 페이지를 **`HydrationBoundary`로 이어받는다** | Should |

### D. 패널 배치

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 조회는 서버 컴포넌트, 저장은 mutation | Must |
| FR-31 | 저장을 **1초 디바운스**한다 | Must |
| FR-32 | 저장 실패를 **사용자에게 알리지 않는다.** 기본 배치로 동작하면 된다 — 편의 기능이다 | Must |
| FR-33 | 재시도 0회 | Must |
| FR-34 | 413(16KB 초과)이면 저장을 포기하고 개발 로그에 남긴다 | Must |

### E. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 스트림 `message.error` → `fallbackText` 렌더 + 배지. **오류 화면 0건** | Must |
| FR-41 | `429`(동시 스트림 초과) → "잠시 후 다시 시도하세요" | Must |
| FR-42 | `401` → refresh → 실패 시 로그인 | Must |
| FR-43 | 블록 실패는 error boundary | Must |
| FR-44 | HTTP → 문구 매핑은 `shared/i18n` | Must |
| FR-45 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### F. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 뷰모델·**SSE 이벤트 타입**을 `packages/core`에서 공유 | Must |
| FR-51 | SSE 이벤트를 **discriminated union**으로: `{ type: 'delta'; text } | { type: 'card'; card } | { type: 'done'; ... } | { type: 'error'; code; fallbackText }` | Must |
| FR-52 | `CardViewModel`이 F004의 `recommendation`과 **같은 타입**이다. 카드 컴포넌트를 재사용한다 | Must |
| FR-53 | 게이트를 **discriminated union**으로 강제한다(`FE-REQ-028` FR-71과 동일) | Must |
| FR-54 | 홈 블록 뷰모델의 금액이 `number \| null`이다. `null`을 무시하면 컴파일 경고 | Must |
| FR-55 | `any` 0건 | Must |

### G. 포지션 · 거래 · 알림 · 설정 · 온보딩 (2026-09-21 추가)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 포지션 첫 화면은 **서버 컴포넌트**가 `GET /api/app/portfolio`와 기본 기간(`1m`) 성과를 병렬 조회한다. 기간 변경은 클라이언트 `useQuery(['performance', range])` **(기본안 — 감사 문서 B13)** | Must |
| FR-61 | 미리보기는 `useMutation`이 아니라 **요청 취소 가능한 조회**(`AbortController`)로 부른다 — 쓰기가 아니다 **(기본안 — 감사 문서 B14)** | Must |
| FR-62 | 거래 `POST/PATCH/DELETE`는 mutation, **재시도 0회**. 성공 후 `['portfolio']` · `['performance']` · `['transactions']` · 홈 총자산 태그를 무효화(`revalidateTag` 포함) | Must |
| FR-63 | 거래 에러 코드(`INSUFFICIENT_QUANTITY` · `VALIDATION`)를 `shared/i18n`으로 매핑한다. 서버 원문 0건 | Must |
| FR-64 | 알림 목록 첫 페이지는 서버 컴포넌트, 이후는 `useInfiniteQuery`. 읽음 · 모두 읽음은 mutation + 낙관적 반영(FE-REQ-031 FR-100) | Must |
| FR-65 | 안 읽은 수는 `useQuery(['alerts','unread'])`, `staleTime: 0`, 폴링 0건. 읽음 mutation 성공 시 무효화 (D5) | Must |
| FR-66 | 설정은 서버 컴포넌트가 `GET /api/app/settings`로 한 번 받고, 그룹별 쓰기는 **소유자 경로**(F003 적립 · F004 코치 · `/settings/alerts`)로 보낸다 (D9 · B16) | Must |
| FR-67 | 온보딩 건너뛰기는 mutation, 재시도 0회. 성공 후 온보딩 상태 태그 무효화 **(기본안 — 감사 문서 B12)** | Must |
| FR-68 | 타입: `PositionViewModel` · `PerformanceViewModel` · `TransactionInput` · `TransactionPreviewViewModel` · `AlertViewModel` · `SettingsViewModel`을 `packages/core`에서 가져온다. `OnboardingStepKey`를 `'invite' \| 'first_holding' \| 'set_plan'`으로 바꾼다 — **BREAKING** | Must |
| FR-69 | `risk.axes`를 **길이 4 튜플 타입**으로 좁힌다. 축 누락이 컴파일에서 드러난다 | Should |

## Acceptance Criteria

- [ ] 홈 블록 3개가 서버 컴포넌트에서 병렬 조회되고 `tax-deadline` · `invoice` 호출이 0건이다
- [ ] `await` 연쇄가 0건이다
- [ ] 토큰이 클라이언트 번들에 0건이다
- [ ] 온보딩 상태가 Suspense 밖에서 조회된다
- [ ] 블록 실패가 error boundary에서 잡힌다
- [ ] **블록별 호출의 서버 부하가 측정되고 게이트가 적용된다**
- [ ] 스트림 구독이 클라이언트 컴포넌트에서만 일어난다
- [ ] **SSE 인증 방식이 확정되고 동작한다** (쿠키 또는 직접 구현)
- [ ] `POST /messages` 재시도가 0건이다 (메시지 중복 생성 0건)
- [ ] 언마운트·취소 시 스트림이 닫힌다
- [ ] 재연결 3회 실패 시 재시도 버튼이 나온다
- [ ] 스트림 완료 후 목록이 갱신된다
- [ ] 메시지 첫 페이지가 서버 컴포넌트, 추가가 `useInfiniteQuery`다
- [ ] 커서 기반이고 offset이 0건이다
- [ ] 패널 저장이 1초 디바운스되고 실패를 사용자에게 알리지 않는다
- [ ] 413 시 저장을 포기하고 개발 로그에 남는다
- [ ] `message.error`에서 `fallbackText`가 렌더되고 오류 화면이 0건이다
- [ ] `429`·`401`이 각각 처리된다
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] SSE 이벤트 타입이 `packages/core`에서 오고 discriminated union이다
- [ ] `CardViewModel`이 F004와 같은 타입이다
- [ ] **게이트가 타입으로 강제된다**
- [ ] 홈 금액이 `number | null`이다
- [ ] `any` 0건
- [ ] 포지션 첫 화면이 서버 컴포넌트 병렬 조회이고 기간 변경이 성과만 부른다
- [ ] 미리보기가 취소 가능한 조회이고 쓰기 mutation이 아니다
- [ ] 거래 쓰기 재시도 0회 · 성공 후 관련 쿼리 · 태그 무효화
- [ ] 알림 목록 · 읽음 · 모두 읽음 · 안 읽은 수 호출이 있고 폴링이 0건이다
- [ ] 설정 쓰기가 소유자 경로로 간다
- [ ] `OnboardingStepKey`에 `link_account`가 0건이다
- [ ] 신규 뷰모델 타입이 `packages/core`에서 온다

## Dependencies

- **선행:** `BFF-REQ-028`(계약) · `FE-REQ-008`(RSC) · `FE-REQ-028`(F004 타입)
- **규칙:** `api-convention.md` · `streaming-ssr.md`

## Open Questions

- **`EventSource` 인증(FR-11).** 쿠키가 가장 단순하지만 `FE-REQ-008`의 쿠키 전환이 선행이다. 직접 구현(`fetch` + `ReadableStream`)이면 헤더를 붙일 수 있지만 재연결을 직접 만들어야 한다. **착수 전 결정 필요.**
- 블록별 호출 5회가 서버 부하 5배가 되는지(`BFF-REQ-030` Open Question). 측정이 답을 준다.
- `HydrationBoundary`로 첫 페이지를 이어받을지. 서버 컴포넌트가 준 데이터를 React Query가 다시 받으면 이중이다.
- 거래 쓰기 후 홈(다른 라우트 서버 컴포넌트) 총자산 갱신: `revalidateTag`로 충분한지, 홈이 `no-store`라 필요 없는지 확인.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 호출 배치 표(세금 · 청구서 · 홈 알림 삭제), FR-1 · FR-6(3블록). 추가: §G FR-60~69(포지션 B13 · 거래 · 미리보기 B14 · 알림 D5 · 설정 D9 · B16 · 온보딩 B12, **BREAKING** `OnboardingStepKey`). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |
