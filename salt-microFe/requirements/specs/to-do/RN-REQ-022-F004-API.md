---
id: RN-REQ-022
feature: F004
area: rn
kind: API
title: "F004 AI 코치 추천 — 모바일 API 호출 계약 정의"
priority: critical
labels: [rn, api, react-query, polling, llm, offline]
created: 2026-09-09
---

## Summary

모바일 코치의 BFF 호출. **전부 React Query**(RSC 없음)이고, LLM 경로와 폴링이 백그라운드 전환에 반응해야 한다.

## 호출 배치

| 화면 요소 | 호출 | 방식 |
|---|---|---|
| 코치 리포트 | ~~`GET /api/app/ai-coach/detail`~~ **`GET /api/app/coach/report`** (개정 2026-09-21) | React Query, `staleTime: 5m` |
| **상세 분석 화면** (2026-09-21) | `GET /api/app/ai-coach/detail?symbol&mode` | React Query, `staleTime: 30s`, 키 `['coach','symbol',symbol]` |
| 관심 추가 (2026-09-21) | 기존 watchlist mutation | mutation |
| 성적표 표 | `GET /api/app/coach/scoreboard` | React Query, `staleTime: 10m` (push 시) |
| 쿨다운 상태 | `GET /api/app/coach/generation-status` | React Query, `staleTime: 0` |
| 재생성 | `POST /api/app/ai-coach/generate` | mutation → 폴링 |
| 피드백 | `POST /api/app/ai-coach/feedback` | mutation (낙관적) |
| 주문 전 계산 | `POST /api/app/trade-preflight` | mutation (버튼) |
| 성향 설정 | `GET/PATCH /api/app/ai-coach/profile` | query + mutation |
| 즉석 해설 | `POST /api/app/ai-coach/explain` | mutation (**사용자 액션만**) |

## Requirements

### A. React Query

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `staleTime`을 전부 명시한다. `detail` 5분, `scoreboard` 10분, `generation-status` 0 | Must |
| FR-2 | `detail`이 6개 소스를 조립한 것이므로 **프론트가 6번 부르지 않는다** | Must |
| FR-3 | `scoreboard`는 **push 시에만** 조회한다. 코치 화면 진입에서 미리 받지 않는다 | Must |
| FR-4 | mutation 재시도 0회 | Must |
| FR-5 | 백그라운드 복귀 시 stale이면 재조회 | Must |
| FR-6 | 조회 훅 `entities/coach/api/`, mutation 훅 `features/*/api/` | Must |

### B. LLM 경로

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **`explain`을 자동 호출하지 않는다** | Must |
| FR-11 | 타임아웃 20s. `AbortSignal` 연결 | Must |
| FR-12 | **백그라운드 전환 시 취소**한다. 모바일에서 20s 요청이 백그라운드에 남으면 안 된다 | Must |
| FR-13 | 재시도 0회 | Must |
| FR-14 | 실패 시 `detail`의 `explanation`(규칙 기반)을 보여준다 | Must |
| FR-15 | 진행 중 재클릭을 막는다 | Must |

### C. 폴링 — 백그라운드 반응

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `generate` 202 후 `generation-status` 또는 `detail`을 폴링한다 | Must |
| FR-21 | 간격 2초, 최대 15회(30초) | Must |
| FR-22 | **중단 조건 5개**: 완료 · 실패 · 언마운트 · 최대 횟수 · **`AppState` 백그라운드** | Must |
| FR-23 | 백그라운드에서 폴링을 멈추고 복귀 시 **한 번 조회**한 뒤 필요하면 재개한다 | Must |
| FR-24 | `AbortSignal` 연결 | Must |
| FR-25 | 완료 시 `detail` 쿼리를 무효화한다 | Must |

### D. 오프라인 persist

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `detail`을 persist한다. 오프라인에서 마지막 추천을 보여준다 | Must |
| FR-31 | `scoreboard`는 persist하지 않는다(자주 안 보고 크다) | Should |
| FR-32 | **토큰은 secure store**, 캐시는 `AsyncStorage` | Must |
| FR-33 | 오프라인에서 mutation을 시도하지 않는다 | Must |
| FR-34 | **`mutationCache` 재생 0건** | Must |
| FR-35 | `dataUpdatedAt`을 오프라인 배너에 쓴다 | Must |

### E. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `429` → `retryAfterSeconds`로 타이머 갱신. **오류 토스트 0건** | Must |
| FR-41 | `401` → refresh → 실패 시 로그인 | Must |
| FR-42 | `explain` 타임아웃 → 규칙 기반 문장 | Must |
| FR-43 | **오프라인과 서버 장애를 구분**한다 | Must |
| FR-44 | HTTP → 문구 매핑은 `shared/i18n` | Must |
| FR-45 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### F. 타입 — 게이트를 타입으로 강제

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 뷰모델 타입을 `packages/core`에서 웹과 공유 | Must |
| FR-51 | **`recommendation`을 discriminated union**으로: `{ renderable: true; signalTrackRecord; failureCases }` \| `{ renderable: false; blockedReason }` | Must |
| FR-52 | `renderable: false` 분기에서 `signalTrackRecord` 접근이 **컴파일 실패** | Must |
| FR-53 | `scoreNote`·`disclaimer`가 필수 필드 | Must |
| FR-54 | 열거값은 `enum`. `any` 0건 | Must |
| FR-55 | preflight 응답 타입에 **게이트·차단 필드가 없다.** 있으면 컴파일 실패 | Must |

### G. 종목 판단 — 상세 분석 화면 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D3 · D4 · B1 · B3 · B10 · B16.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 쿼리 키에 **모드를 넣지 않는다**(두 모드가 한 응답). 모드 전환 요청 0건 | Must |
| FR-61 | navigation param 에 `mode` 가 없으면 요청에도 `mode` 를 싣지 않는다(서버 `defaultMode`, B16) | Must |
| FR-62 | 화면 이탈 · 다른 종목 push 시 진행 중 요청을 `AbortSignal` 로 끊는다 | Must |
| FR-63 | 상세 판단을 persist 한다(`detail` 과 같은 정책, FR-30). **persist 키는 종목별**, 최근 10종목까지(추적 상한 D8 과 같은 수) | Should |
| FR-64 | 해설 요청에 `mode` 를 싣고 응답 판별 union 의 `renderable: false` 를 타입으로 처리한다(B3) | Must |
| FR-65 | preflight 요청에 `stopLossRate` 를 싣고 목표가는 입력 시에만(B1) | Must |
| FR-66 | 관심 추가 성공 시 관심 종목 쿼리만 무효화 — 코치 쿼리를 건드리지 않는다(D4) | Must |
| FR-67 | `SymbolCoachViewModel` · `ModeCoachViewModel` 타입은 `packages/core` 에서 웹과 공유. `renderable: false` 에서 `judgment` 접근 컴파일 실패 · `confidence` 필드 없음 | Must |

## Acceptance Criteria

- [ ] `staleTime`이 전부 명시되어 있다
- [ ] 코치 리포트가 `/coach/report` 1회 호출이다 (6번 호출 0건, 개정 2026-09-21)
- [ ] `scoreboard`가 push 시에만 조회된다
- [ ] mutation 재시도가 0건이다
- [ ] 백그라운드 복귀 시 stale 데이터가 재조회된다
- [ ] **`explain`이 자동 호출되지 않는다**
- [ ] `explain` 타임아웃 20s, `AbortSignal` 연결
- [ ] **백그라운드 전환 시 `explain`이 취소된다**
- [ ] `explain` 실패 시 규칙 문장이 표시된다
- [ ] 진행 중 재클릭이 막힌다
- [ ] 202 후 폴링이 2초 간격 최대 15회다
- [ ] **폴링 중단 조건 5개가 있다** (백그라운드 포함)
- [ ] 백그라운드 복귀 시 한 번 조회 후 재개한다
- [ ] 완료 시 `detail`이 무효화된다
- [ ] `detail`이 persist되고 오프라인에서 반환된다
- [ ] **토큰이 secure store에 있고 `AsyncStorage`에 0건이다**
- [ ] 오프라인에서 mutation이 시도되지 않는다
- [ ] **`mutationCache` 재생이 0건이다**
- [ ] `dataUpdatedAt`이 배너에 쓰인다
- [ ] `429`가 타이머 갱신이고 오류 토스트가 0건이다
- [ ] **오프라인과 서버 장애가 구분된다**
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델 타입이 `packages/core`에서 온다
- [ ] **`renderable: false`에서 `signalTrackRecord` 접근이 컴파일 실패한다**
- [ ] `scoreNote`·`disclaimer`를 옵셔널로 바꾸면 컴파일 실패한다
- [ ] preflight 타입에 게이트 필드가 없다
- [ ] `any` 0건
- [ ] 상세 판단 쿼리 키에 모드가 없고 모드 전환 요청이 0건이다
- [ ] param 에 `mode` 가 없으면 요청에도 없다
- [ ] 화면 이탈 시 상세 판단 요청이 취소된다
- [ ] 해설 `renderable: false` 분기가 타입으로 처리된다
- [ ] preflight 에 `stopLossRate` 가 실리고 목표가는 입력 시에만 실린다
- [ ] 관심 추가가 코치 쿼리를 무효화하지 않는다
- [ ] **`ModeCoachViewModel` 의 `renderable: false` 에서 `judgment` 접근이 컴파일 실패한다**

## Dependencies

- **선행:** `BFF-REQ-024`(계약) · `RN-REQ-001`(`packages/core`)
- **규칙:** `api-convention.md` · `rn-architecture.md`

## Open Questions

- `detail`을 persist하면 **오프라인에서 오래된 추천이 보인다.** `staleHours`와 오프라인 시각을 둘 다 표시해 혼동을 줄이지만, 추천은 시점이 중요하므로 **persist하지 않는 것도 검토**할 만하다.
- `explain`을 아예 만들지 않을지(`FE-REQ-029` Open Question).
- discriminated union이 BFF 계약과 일치해야 한다(`BFF-REQ-024` Open Question).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 호출 배치 개정 — 코치 리포트 `/api/app/coach/report`, 상세 분석 화면 `/api/app/ai-coach/detail?symbol&mode`. 신규 G 절 FR-60~67(모드 무관 쿼리 키 · `defaultMode` 위임(B16) · 취소 · 종목별 persist · 해설 union(B3) · `stopLossRate`(B1) · 관심 추가 분리(D4) · 판별 union 타입(B10)) |
