---
id: BFF-REQ-026
feature: F004
area: bff
kind: PERF
title: "F004 AI 코치 추천 — BFF 성능 정의 (LLM 경로 격리 · 게이트 카운터)"
priority: critical
labels: [bff, performance, budget, llm, concurrency]
created: 2026-09-09
---

## Summary

F004의 BFF 성능 급소는 **LLM이 걸린 경로가 BFF 커넥션을 오래 잡는 것**이다. `explain`은 20s 타임아웃이고, 그 동안 커넥션 하나가 묶인다.

## 예산

| 엔드포인트 | 예산 | 내역 |
|---|---|---|
| `GET /api/app/ai-coach/preview` | **450ms** | 서버 400ms + BFF 20ms |
| `GET /api/app/ai-coach/detail` | **450ms** | 서버 400ms |
| `GET /api/app/coach/scoreboard` | 350ms | |
| `GET /api/app/coach/generation-status` | **50ms** | 서버 20ms |
| `GET /api/app/profit-plan` | 200ms | |
| `GET /api/app/signal-performance` | 350ms | |
| `POST /api/app/trade-preflight` | 150ms | |
| `GET /api/app/behavior-coach` | 250ms | |
| `POST /api/app/ai-coach/feedback` | 100ms | |
| `POST /api/app/ai-coach/generate` | **200ms** | 202 즉시 |
| **`POST /api/app/ai-coach/explain`** | **20s** | LLM. **예산이 아니라 상한** |
| **BFF가 얹는 지연** | **20ms 이하** | |

## 급소 — LLM 경로가 커넥션을 잡는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **동시 `explain` 호출을 2개로 제한**한다. 초과 시 429 또는 큐 대기(짧게) | Must |
| FR-2 | `explain` 타임아웃 20s. 초과 시 끊고 실패 응답 | Must |
| FR-3 | `explain`을 재시도하지 않는다 | Must |
| FR-4 | **`generate`는 202를 즉시 받는다.** 6s를 기다리지 않는다. 타임아웃 1s | Must |
| FR-5 | LLM 경로의 커넥션 사용을 별도로 측정한다. **다른 요청이 굶지 않는지** 확인 | Must |
| FR-6 | `explain` 요청이 몰리면 **프론트 디바운스가 근본 해결**이다. BFF 상한은 방어선이다 | Must |

## 조립 — 서버가 한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `/detail`은 **서버 1회 호출**이다. BFF가 6개 소스를 각각 부르지 않는다 | Must |
| FR-11 | BFF가 조립하면 서버 호출이 6회가 되고 예산(450ms)을 못 지킨다 | Must |
| FR-12 | 홈 프리뷰와 코치 상세를 **각각 호출**한다. 홈은 요약만 필요하다 | Must |
| FR-13 | `await` 연쇄 0건 | Must |

## 캐시

| 대상 | 정책 |
|---|---|
| 추천 (`preview`·`detail`) | **캐시하지 않는다.** 서버가 이미 저장된 insight를 준다 |
| 성적표 | 캐시하지 않는다. 서버가 계산한다 |
| `explain` 결과 | **서버가 5분 캐시**한다. BFF에서 다시 캐시하지 않는다 |
| `generation-status` | 캐시하지 않는다. 쿨다운은 실시간이다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | BFF에 새 캐시를 만들지 않는다 | Must |
| FR-21 | 두 곳에 캐시를 두면 쿨다운·`staleHours`가 틀어진다 | Must |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `payload` 전체가 전달되지 않는지 확인한다. 서버가 필요한 필드만 준다 | Must |
| FR-31 | 성적표 샘플 20건 · 후보 3개 · 실패이력 3건 상한을 서버가 지킨다. **BFF가 자르지 않는다** | Must |
| FR-32 | `reasons`·`topFactors`가 길면 응답이 커진다. 서버 상한을 확인한다 | Should |

## 관측성 — 게이트 카운터가 핵심

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **게이트 미렌더 카운터를 BFF에서도 남긴다**: `blockedReason`별. 서버와 BFF 양쪽에서 보면 전달 과정의 유실을 잡는다 | Must |
| FR-41 | 측정: 엔드포인트별 p95, **`explain` 동시 호출 수·대기 시간**, `generate` 202 비율, 429 발생률, LLM 실패 전달률(`explanation.source: 'rule'` 비율) | Must |
| FR-42 | **`explanation.source: 'rule'` 비율이 높으면 LLM이 자주 실패하고 있다는 신호**다. 알림 임계를 둔다 | Must |
| FR-43 | **BFF가 얹는 지연**을 별도 측정한다 | Must |
| FR-44 | `explain` 요청·응답을 로깅하지 않는다. 지연과 성공 여부만 | Must |
| FR-45 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] **동시 `explain` 호출이 2개로 제한된다** (3번째가 429 또는 대기)
- [ ] `explain` 타임아웃이 20s이고 재시도가 0건이다
- [ ] **`generate`가 200ms 이내에 202를 반환한다** (측정값 기록)
- [ ] LLM 경로 커넥션 사용이 측정되고 다른 요청이 굶지 않는다
- [ ] `/detail`이 서버를 1회 호출한다
- [ ] `await` 연쇄가 0건이다
- [ ] BFF에 새 캐시가 0건이다
- [ ] 서버 상한(샘플 20 · 후보 3 · 실패이력 3)을 BFF가 자르지 않는다
- [ ] `preview` p95 < 450ms (측정값 기록)
- [ ] `detail` p95 < 450ms (측정값 기록)
- [ ] `generation-status` p95 < 50ms
- [ ] **게이트 미렌더 카운터가 `blockedReason`별로 있다**
- [ ] `explanation.source: 'rule'` 비율이 측정되고 알림 임계가 있다
- [ ] **BFF가 얹는 지연 < 20ms** (측정값 기록)
- [ ] `explain` 요청·응답이 로그에 0건이다

## Dependencies

- **선행:** `BFF-REQ-023`~`025` · `SRV-REQ-027`(서버 성능)
- **규칙:** `performance-bff.md`

## Open Questions

- `explain` 동시 상한 2가 적절한가. **프론트 디바운스가 근본 해결**이므로 상한은 방어선이면 된다.
- `explain`을 프리뷰에서 자동 호출할지 사용자가 누를 때만 부를지. **자동이면 종목을 지나갈 때마다 LLM이 돌고 비용이 든다** → 사용자 액션 기반이 기본안이고, 그러면 동시 호출 문제가 거의 사라진다.
- 게이트 미렌더 카운터를 서버와 BFF 양쪽에 두면 중복이다. **BFF만으로 충분할 수 있다.**
