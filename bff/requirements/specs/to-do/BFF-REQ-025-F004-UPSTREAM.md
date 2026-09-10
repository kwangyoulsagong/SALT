---
id: BFF-REQ-025
feature: F004
area: bff
kind: UPSTREAM
title: "F004 AI 코치 추천 — 서버 호출 계약 정의"
priority: critical
labels: [bff, upstream, backend-integration, coach, llm]
created: 2026-09-09
---

## Summary

BFF가 부르는 서버 엔드포인트. **LLM이 걸린 경로(`generate`·`explain`)의 타임아웃과 재시도 정책**이 이 REQ의 핵심이다.

## 호출 맵

| BFF 함수 | 서버 호출 | 타임아웃 | 재시도 |
|---|---|---|---|
| `coachPreview` | `GET /api/ai-coach?preview=true` | 400ms | 1회 |
| `coachDetail` | `GET /api/coach/detail` | **800ms** | 1회 |
| `scoreboard` | `GET /api/coach/scoreboard` | 600ms | 1회 |
| `generationStatus` | `GET /api/coach/generation-status` | 300ms | 1회 |
| `profile` GET/PATCH | `GET/PATCH /api/ai-coach/profile` | 400ms | GET 1회 / PATCH 0회 |
| `feedback` | `POST /api/ai-coach/feedback` | 600ms | **0회** |
| `explain` | `POST /api/ai-coach/explain` | **20s** | **0회** |
| `generate` | `POST /api/ai-coach/generate` | **1s** (202 기대) | **0회** |
| `profitPlan` | `GET /api/profit-plan` | 400ms | 1회 |
| `signalPerformance` | `GET /api/signal-performance?groupBy` | 600ms | 1회 |
| `preflight` | `POST /api/trade-preflight` | 400ms | 0회 |
| `behaviorCoach` | `GET /api/behavior-coach` | 500ms | 1회 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`explain` 타임아웃은 20s**다. LLM 호출이다. 그동안 BFF 커넥션이 하나 잡힌다 | Must |
| FR-2 | **`explain`을 재시도하지 않는다.** LLM 재시도가 비용이고, 서버가 이미 폴백을 갖고 있다 | Must |
| FR-3 | **`generate` 타임아웃은 1s**다. 서버가 202를 즉시 반환해야 한다. 6s를 기다리면 안 된다 | Must |
| FR-4 | `generate`가 6s 응답을 주면 **그것은 서버 계약 위반**이다. 계약 테스트로 잡는다 | Must |
| FR-5 | mutation(`feedback`·`profile` PATCH·`explain`·`generate`·`preflight`)은 **재시도 0회** | Must |
| FR-6 | 서버 에러 코드를 그대로 전달: **`429` + `Retry-After`** · `422` · `401` | Must |
| FR-7 | **동시 `explain` 호출 수를 제한**한다(기본 2). LLM 호출이 쌓이면 서버가 막힌다 | Must |

## 인증 전달

서버 `explain`이 **public에서 인증 필수로 바뀐다**(`SRV-REQ-025` FR-11).

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `explain` 호출에 **토큰을 전달**한다. BFF 라우트에도 `authMiddleware`를 붙인다 | Must |
| FR-11 | 이 변경은 **서버와 동시 배포**여야 한다. BFF가 먼저 토큰을 보내면 서버가 무시하므로 안전하고, 서버가 먼저 인증을 요구하면 BFF가 401을 받는다 → **BFF 먼저** | Must |
| FR-12 | 토큰을 해석하지 않는다. 그대로 전달 | Must |

## 계약 의존 — 서버가 바뀌면 여기가 깨진다

| 서버 필드 | 변경 시 영향 |
|---|---|
| **`renderable`·`blockedReason`** | **3종 세트 게이트.** 누락되면 화면이 게이트를 우회한다 → **정책 위반** |
| **`signalTrackRecord`** | 게이트 + 성적표 배지 |
| **`failureCases`** | 게이트 + 실패사례 아코디언 |
| `scoreNote` | "점수는 확률이 아닙니다" 문구 |
| `disclaimer` | 면책 배너 |
| `reasons` · `topFactors` | 근거 목록 |
| `exitPlans[].distancePct` | 익절 카드 거리 표시 |
| `behaviorFacts[].factCode`·`params` | 행동 기록 문구 |
| `excluded[]` | 국내주식 제외 문구 |
| `lowSample` | 표본 부족 배지 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **`renderable`이 없으면 응답을 내보내지 않고 `unavailable`로 처리**한다. 게이트 없이 추천을 내보내는 것이 가장 위험한 실패다 | Must |
| FR-21 | `signalTrackRecord`·`failureCases`가 없으면 **기본값을 만들지 않는다.** `null`/빈 배열 그대로 | Must |
| FR-22 | `disclaimer`가 없으면 `unavailable`로 처리한다. 면책은 정책이다 | Must |
| FR-23 | `scoreNote`가 없으면 `unavailable`로 처리한다 | Must |
| FR-24 | 계약 스냅샷 테스트를 둔다. **게이트 필드 3개(`renderable`·`signalTrackRecord`·`failureCases`)를 특히 고정**한다 | Must |

## 하지 않는 것

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **LLM을 직접 부르지 않는다.** 서버를 경유한다 | Must |
| FR-31 | 점수를 계산하지 않는다 | Must |
| FR-32 | 게이트를 판정하지 않는다 | Must |
| FR-33 | **주문 API를 중계하지 않는다** | Must |
| FR-34 | 프롬프트를 만들지 않는다. `explain` 요청 본문을 그대로 전달 | Must |
| FR-35 | `explain` 요청·응답을 **로깅하지 않는다** | Must |

## Acceptance Criteria

- [ ] `explain` 타임아웃이 20s다
- [ ] `explain`이 재시도되지 않는다
- [ ] **`generate` 타임아웃이 1s이고 서버가 202를 반환한다**
- [ ] `generate`가 6s 응답을 주면 계약 테스트가 실패한다
- [ ] mutation 5종이 재시도되지 않는다
- [ ] `429` + `Retry-After`가 그대로 전달된다
- [ ] **동시 `explain` 호출이 2개로 제한된다**
- [ ] `explain` 호출에 토큰이 전달되고 BFF 라우트에 `authMiddleware`가 있다
- [ ] **`renderable`이 없으면 `unavailable`로 처리된다**
- [ ] `signalTrackRecord`·`failureCases`가 기본값으로 채워지지 않는다
- [ ] `disclaimer`·`scoreNote`가 없으면 `unavailable`이다
- [ ] **계약 스냅샷 테스트가 게이트 필드 3개를 고정한다**
- [ ] BFF에 LLM 직접 호출·점수 계산·게이트 판정 코드가 0건이다
- [ ] 주문 중계 경로가 0건이다
- [ ] `explain` 요청·응답이 로그에 0건이다

## Dependencies

- **선행:** `SRV-REQ-025`(서버 계약)
- **순서:** FR-11 — **BFF 먼저 배포**(토큰 전달) 후 서버 인증 필수화
- **규칙:** `backend-integration.md` · `config-security.md`

## Open Questions

- `generate`가 202를 반환하면 **프론트가 완료를 어떻게 아는가.** `generation-status` 폴링이 기본안이지만, 6s면 폴링 3회 정도다.
- `explain` 동시 호출 상한 2가 적절한가. 사용자 ≤10명이면 충분해 보이지만 프리뷰에서 종목을 빠르게 바꾸면 호출이 쌓인다 → **디바운스를 프론트에 두는 것이 더 효과적**이다.
- `renderable` 누락 시 `unavailable`로 처리하면 **서버 버그가 화면 전체를 막는다.** 그것이 게이트 우회보다 안전하다는 판단이지만, 대안은 없는지 검토.
