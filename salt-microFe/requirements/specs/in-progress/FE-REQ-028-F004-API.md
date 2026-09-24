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
| 코치 리포트 | ~~`GET /api/app/ai-coach/detail`~~ **`GET /api/app/coach/report`** (개정 2026-09-21 — `BFF-REQ-024`) | 서버 컴포넌트 | 안 |
| **우측 AI 코치 패널** (2026-09-21) | `GET /api/app/ai-coach/detail?symbol&mode` | **클라이언트**(React Query) — 행 선택이 클라이언트 상태다 | — |
| **상세 분석 페이지** (2026-09-21) | `GET /api/app/ai-coach/detail?symbol&mode` | 서버 컴포넌트(라우트 `[symbol]`) | 안 |
| 추천 근거 상세 (2026-09-21) | `GET /api/app/coach/scoreboard` (그룹 1개) | 서버 컴포넌트 | — |
| 성적표 표 | `GET /api/app/coach/scoreboard` | 서버 컴포넌트 | 안 |
| 익절 플랜 | (detail에 포함) | — | — |
| 행동 기록 | (detail에 포함) | — | — |
| 쿨다운 상태 | `GET /api/app/coach/generation-status` | 클라이언트 (폴링) | — |
| 재생성 | `POST /api/app/ai-coach/generate` | mutation → 폴링 | — |
| 피드백 | `POST /api/app/ai-coach/feedback` | mutation | — |
| 주문 전 계산 | `POST /api/app/trade-preflight` | mutation (버튼) | — |
| 성향 설정 | `GET/PATCH /api/app/ai-coach/profile` | 서버 조회 + mutation | — |
| 즉석 해설 | `POST /api/app/ai-coach/explain` | mutation (**사용자 액션만**) — 상세 분석 페이지 [해설 보기] | — |
| 관심 추가 (2026-09-21) | 기존 watchlist mutation | mutation | — |

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

### I. 종목 판단 — 패널 · 상세 분석 페이지 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D3 · D7 · B1 · B3 · B10 · B16.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | **패널 조회는 클라이언트다**(FR-1 · FR-60 원칙의 예외). 행 선택 · hover 가 클라이언트 상태라 RSC 재요청은 과하다. 인증은 BFF 쿠키 세션 — **토큰을 클라이언트 번들 · `localStorage` 에 두지 않는다**는 FR-1 은 그대로 | Must |
| FR-81 | 패널 쿼리 키 = `['coach', 'symbol', symbol]` — **모드를 키에 넣지 않는다**(응답에 두 모드가 다 있다). `staleTime: 30s` | Must |
| FR-82 | 행 선택이 바뀌면 이전 요청을 `AbortSignal` 로 끊는다. hover 로 선택하는 PC 는 **150ms 디바운스** 후 요청한다 | Must |
| FR-83 | 모드 전환은 **요청 0건**이다. `router.replace('?mode=')` 로 URL 만 바꾼다. **개정 2026-09-22**: `history.replaceState` — `router.replace` 는 RSC 재요청을 만든다(실측 요청 0건은 `replaceState` 로 확인) | Must |
| FR-84 | 상세 분석 페이지는 라우트 `/investments/[symbol]` 서버 컴포넌트가 1회 조회한다. 패널에서 넘어올 때 React Query 캐시를 **초기 데이터로 재사용하지 않는다**(서버 컴포넌트가 새로 받는다 — 두 경로가 섞이면 staleness 가 갈린다) | Should |
| FR-85 | `mode` 쿼리가 URL 에 없으면 **BFF 에 `mode` 를 보내지 않는다**(서버 `defaultMode`, B16) | Must |
| FR-86a | 해설 요청 본문은 **`{ symbol, mode }` 뿐이다**(개정 2026-09-24, C01 · 서버 `SRV-REQ-025` FR-58). 화면이 시세 · 근거 · 뉴스를 옮겨 적지 않는다 — 시세 목록에 종목이 없어도 해설을 부를 수 있다("시세 정보를 찾지 못해" 경로 삭제) | Must |
| FR-86 | 해설 요청 본문에 `mode` 를 싣는다. 응답이 판별 union 이므로 `renderable: false` 분기를 타입으로 처리한다(B3) | Must |
| FR-87 | preflight 요청에 `stopLossRate` 를 싣고 `takeProfitPrices` 는 사용자가 입력했을 때만 싣는다(B1) | Must |
| FR-88 | 관심 추가는 기존 watchlist mutation. 성공 시 관심 종목 쿼리만 무효화한다 — 코치 쿼리를 건드리지 않는다(D4) | Must |
| FR-89 | 뷰모델 타입 `SymbolCoachViewModel` · `ModeCoachViewModel` 은 `packages/core`(BFF-REQ-024 FR-30). **`renderable: false` 분기에서 `judgment` 접근이 컴파일 실패**한다 · `confidence` 필드가 타입에 없다 | Must |

## Acceptance Criteria

- [ ] 조회가 전부 서버 컴포넌트에서 일어난다
- [ ] 토큰이 클라이언트 번들·`localStorage`에 0건이다
- [ ] `detail`과 `scoreboard`가 병렬로 호출된다
- [ ] 코치 리포트가 `/coach/report` 1회 호출이다 (6번 호출 0건, 개정 2026-09-21)
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
- [ ] 패널이 클라이언트 조회이고 토큰이 클라이언트에 0건이다
- [ ] 패널 쿼리 키에 모드가 없고 모드 전환 요청이 0건이다
- [ ] 행 선택 변경 시 이전 요청이 취소되고 hover 는 150ms 디바운스다
- [ ] 상세 분석 페이지가 서버 컴포넌트 1회 조회다
- [ ] URL 에 `mode` 가 없으면 요청에도 `mode` 가 없다
- [ ] 해설 응답의 `renderable: false` 분기가 타입으로 처리된다
- [ ] preflight 에 `stopLossRate` 가 실리고 목표가는 입력 시에만 실린다
- [ ] 관심 추가가 코치 쿼리를 무효화하지 않는다
- [ ] **`ModeCoachViewModel` 의 `renderable: false` 분기에서 `judgment` 접근이 컴파일 실패한다**

## Dependencies

- **선행:** `BFF-REQ-024`(계약) · `FE-REQ-008`(RSC) · `FE-REQ-009`(FSD)
- **규칙:** `api-convention.md` · `streaming-ssr.md`

## Open Questions

- **FR-71의 discriminated union이 BFF 계약과 일치하는가.** BFF가 `renderable: false`일 때도 `signalTrackRecord: null`을 보내면 타입이 맞지 않는다 → **BFF와 타입을 함께 정의**해야 한다(`BFF-REQ-024` Open Question).
- `failureCases`를 non-empty tuple로 타입 정의하면 런타임 검증이 필요하다. 타입만으로는 보장되지 않는다.
- `explain`을 프리뷰에서 자동 호출하지 않으면 **홈 요약 카드의 해설은 어디서 오는가.** `detail`의 `explanation`(생성 시 저장된 것)을 쓰는 것이 답이다.
- 패널 조회를 클라이언트로 두는 예외(FR-80)가 스트리밍 SSR 원칙과 맞는가. 첫 선택 종목만 서버에서 받아 초기 데이터로 넣는 절충이 가능하다 — 측정 후 판단.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 호출 배치 개정 — 코치 리포트는 `/api/app/coach/report`, `/api/app/ai-coach/detail` 은 패널 · 상세 분석 페이지. 신규 I 절 FR-80~89(패널 클라이언트 조회 예외 · 모드 무관 쿼리 키 · 모드 전환 무요청(D3) · 취소/디바운스 · `defaultMode` 위임(B16) · 해설 union(B3) · preflight `stopLossRate`(B1) · 관심 추가 분리(D4) · 판별 union 타입(B10)) |
| 2026-09-22 | FE 패널 슬라이스 착수 — `to-do → in-progress`. 패널 조회 FR-80~83 · FR-85 · FR-89 구현. FR-83 방식 개정(`history.replaceState`) |
| 2026-09-22 | 상세 분석 슬라이스 — 해설 FR-10~13 · FR-62 · FR-86(부분) · FR-88 구현. **FR-84 는 클라이언트 조회로 다르게 구현**(토큰이 `localStorage` — `FE-REQ-013` 후 서버 컴포넌트로). FR-86 `renderable` union 은 서버 응답에 없어 막힌 모드는 버튼을 그리지 않는 것으로 처리 |
| 2026-09-22 | 서버가 해설을 게이트 뒤에 두면서(`SRV-REQ-025` FR-50) 응답이 합 타입이 됐다 — `ExplainResult` 로 받는다. 요청 · 재시도 · 타임아웃 계약은 그대로 |
| 2026-09-23 | F004 슬라이스 15 — 리포트 조회(FR-3 · 4) · 재생성 · 폴링(FR-20~26). FR-1 · FR-27 다르게(클라이언트 조회 → 쿼리 무효화). 완료 판정은 `@repo/core/coach` `readGenerationOutcome` — 워커 행은 `inProgress` 로만 본다 |
| 2026-09-24 | **F009 슬라이스 0 — C01.** FR-86a 신설. `buildExplainRequest(view, mode)` · `ExplainSubject` 삭제 · 근거 라벨 메시지 삭제(서버 소유) |
