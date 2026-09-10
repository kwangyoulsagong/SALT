---
id: BFF-REQ-023
feature: F004
area: bff
kind: FUNC
title: "F004 AI 코치 추천 — BFF 조립 로직 정의 (3종 세트 게이트 전달 · 성적표 그룹)"
priority: critical
labels: [bff, viewmodel, render-gate, coach]
created: 2026-09-09
---

## Summary

BFF는 이미 `/api/app/ai-coach/*` · `/profit-plan` · `/signal-performance` · `/trade-preflight` · `/behavior-coach` 5개 라우트를 갖고 있다. F004의 BFF 작업은 **신규가 아니라 필드 추가와 조립**이다.

가장 중요한 규칙: **BFF가 게이트를 판정하지 않는다.** 서버가 `renderable`을 주고 BFF는 그대로 전달한다.

## 지금 있는 것

| BFF 라우트 | 상태 |
|---|---|
| `GET /api/app/ai-coach/preview` | **기존** — 홈 요약용 |
| `GET /api/app/ai-coach/detail` | **기존** — `signalTrackRecord`·`failureCases` **추가 필요** |
| `GET/PATCH /api/app/ai-coach/profile` | 기존 |
| `POST /api/app/ai-coach/feedback` | 기존 — `reasonCode` 추가 |
| `POST /api/app/ai-coach/explain` | 기존 — **인증 전달 추가** |
| `POST /api/app/ai-coach/generate` (proxy) | 기존 — **쿨다운 429 전달** |
| `GET /api/app/profit-plan` | 기존 — `distanceFromCurrentPct` 추가 |
| `GET /api/app/signal-performance` | 기존 — **그룹 지원 추가** |
| `POST /api/app/trade-preflight` | 기존 |
| `GET /api/app/behavior-coach` | 기존 — `factCode` 추가 |

## 게이트는 전달만 한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 서버가 준 **`renderable`·`blockedReason`을 그대로 전달**한다 | Must |
| FR-2 | **BFF가 게이트를 판정하지 않는다.** `signalTrackRecord`가 null인지 보고 `renderable`을 만들지 않는다 | Must |
| FR-3 | **BFF가 게이트를 우회하지 않는다.** `renderable: false`를 `true`로 바꾸는 코드가 0건이다 | Must |
| FR-4 | `signalTrackRecord`가 없으면 **기본값을 만들지 않는다.** `null`을 그대로 전달 | Must |
| FR-5 | `failureCases`가 비면 **빈 배열을 그대로** 전달한다. 채우지 않는다 | Must |
| FR-6 | `renderable: false`가 **200**이다. BFF가 에러로 바꾸지 않는다 | Must |
| FR-7 | 게이트 미충족 카운터를 BFF에서도 남긴다(관측성) | Should |

## 조립 — `/detail`

서버 `/api/coach/detail`이 이미 조립하므로 **BFF는 필드명 변환과 부분 실패 격리만** 한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 서버 `/api/coach/detail` 1회 호출로 받는다. **BFF가 6개 소스를 각각 부르지 않는다** | Must |
| FR-11 | 서버가 필드별 `null`을 주면 그대로 전달하고 `degradedFields[]`에 이름을 넣는다 | Must |
| FR-12 | 서버 호출이 실패하면 **마지막 성공 응답이 없으므로** `status: 'unavailable'`이다. BFF가 캐시하지 않는다 | Must |
| FR-13 | 타임아웃을 둔다(800ms). 초과 시 `unavailable` | Must |
| FR-14 | `staleHours`를 그대로 전달한다. **BFF가 재계산하지 않는다**(서버 시계가 기준이다) | Must |

## 성적표 그룹

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `?groupBy=signalType`을 서버에 전달한다 | Must |
| FR-21 | `lowSample`을 그대로 전달한다. **BFF가 표본 임계를 판정하지 않는다** | Must |
| FR-22 | `status: insufficient_data`를 그대로 전달한다 | Must |
| FR-23 | 기존 무인자 호출을 **하위 호환**으로 유지한다 | Must |
| FR-24 | 샘플 20건 상한을 서버가 지키므로 BFF가 자르지 않는다 | Must |

## 익절 플랜

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `distanceFromCurrentPct`를 그대로 전달한다. **BFF가 계산하지 않는다** | Must |
| FR-31 | 3자산군을 전달한다. `crypto` 필터를 BFF에 두지 않는다 | Must |
| FR-32 | `trendHold.conditionCode`를 코드로 전달한다. 문구를 만들지 않는다 | Must |

## 행동 기록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `factCode` + `params`를 전달한다. **완성 문장을 만들지 않는다** | Must |
| FR-41 | 기존 응답 필드를 **유지**한다(하위 호환) | Must |
| FR-42 | 청구서 링크(`invoiceLink`)를 BFF가 만든다. **경로 조립은 BFF의 일**이다 | Should |

## 피드백

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `reasonCode` 4종을 전달한다. **BFF가 검증하지 않는다**(서버가 한다) | Must |
| FR-51 | mutation이므로 **재시도하지 않는다** | Must |
| FR-52 | 성공 시 `insightId`를 반환해 화면이 상태를 갱신할 수 있게 한다 | Should |

## 재생성과 쿨다운

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `POST /generate`의 **429 + `retryAfterSeconds`를 그대로 전달**한다 | Must |
| FR-61 | **BFF가 쿨다운을 판정하지 않는다.** 서버가 판정한다 — BFF에 상태를 두면 인스턴스가 늘 때 깨진다 | Must |
| FR-62 | 재시도하지 않는다. 쿨다운 중 재시도는 429를 반복할 뿐이다 | Must |
| FR-63 | `GET /api/app/coach/generation-status`를 추가해 남은 시간을 조회한다 | Must |

## `explain` 인증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 서버 `explain`이 인증을 요구하게 되므로 **BFF가 토큰을 전달**해야 한다 | Must |
| FR-71 | BFF 라우트에도 `authMiddleware`를 붙인다 | Must |
| FR-72 | rate limit을 BFF에도 둘지 판단한다. **서버가 하면 충분**하다 | Should |

## 하지 않는 것

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | **점수를 계산하지 않는다** | Must |
| FR-81 | **LLM을 부르지 않는다.** 해설은 서버가 만든 것을 전달한다 | Must |
| FR-82 | **게이트를 판정하지 않는다** | Must |
| FR-83 | **문구를 만들지 않는다.** 코드만 전달 | Must |
| FR-84 | **주문을 중계하지 않는다.** `trade-preflight`는 계산 표시 전용이다 | Must |

## Acceptance Criteria

- [ ] `renderable`·`blockedReason`이 그대로 전달된다
- [ ] **BFF가 게이트를 판정하는 코드가 0건이다** (코드 리뷰)
- [ ] `renderable: false`를 `true`로 바꾸는 코드가 0건이다
- [ ] `signalTrackRecord` null이 기본값으로 채워지지 않는다
- [ ] `failureCases` 빈 배열이 채워지지 않는다
- [ ] `renderable: false`가 200이다
- [ ] `/detail`이 서버를 1회 호출한다 (요청 로그)
- [ ] 서버 필드별 `null`이 `degradedFields[]`에 반영된다
- [ ] `/detail` 실패 시 `unavailable`이고 BFF 캐시가 0건이다
- [ ] `staleHours`가 BFF에서 재계산되지 않는다
- [ ] `?groupBy=signalType`이 전달되고 무인자 호출이 하위 호환이다
- [ ] `lowSample`·`insufficient_data`가 그대로 전달된다
- [ ] `distanceFromCurrentPct`가 BFF에서 계산되지 않는다
- [ ] 익절 플랜에 `crypto` 필터가 0건이다
- [ ] `factCode` + `params`가 전달되고 완성 문장이 0건이다
- [ ] `behavior-coach` 기존 응답이 하위 호환이다
- [ ] `reasonCode`가 전달되고 BFF 검증이 0건이다
- [ ] 피드백 mutation 재시도가 0건이다
- [ ] **429 + `retryAfterSeconds`가 그대로 전달된다**
- [ ] BFF에 쿨다운 상태가 0건이다
- [ ] `generation-status` 라우트가 있다
- [ ] `explain` 라우트에 `authMiddleware`가 있다
- [ ] BFF에 점수 계산·LLM 호출·게이트 판정·문구 생성 코드가 0건이다
- [ ] 주문 중계 경로가 0건이다

## Dependencies

- **선행:** `BFF-REQ-006`(레이어) · `SRV-REQ-025`(서버 계약)
- **짝:** `BFF-REQ-024`(API) · `025`(UPSTREAM) · `026`(PERF)
- **규칙:** `bff-architecture.md`

## Open Questions

- `/detail`을 서버가 조립할지 BFF가 조립할지. **서버가 조립하면 BFF가 얇아지지만** 서버에 조합 컨텍스트가 필요하다 → `coach` 안에서 조립하는 것이 기본안(같은 컨텍스트다).
- `invoiceLink` 경로 조립을 BFF가 할지 프론트가 할지. **프론트가 경로를 아는 것이 자연스럽다** → FR-42를 Should로 둔 이유.
- `explain`이 PM 프로토타입용 public이었다. 인증을 붙이면 프로토타입이 깨진다(`SRV-REQ-025` Open Question).
