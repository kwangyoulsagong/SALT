---
id: SRV-REQ-027
feature: F004
area: srv
kind: PERF
title: "F004 AI 코치 추천 — 서버 성능 정의 (N+1 제거 · LLM 비동기 · 쿨다운)"
priority: critical
labels: [performance, budget, n+1, llm, cooldown]
created: 2026-09-09
---

## Summary

F004의 성능은 **두 개의 병목**에서 결정된다: ① `signal-performance`의 **200 쿼리 N+1** ② **LLM 호출 수십 초**. 전자는 Projection으로, 후자는 비동기 + 저장으로 해결한다.

## 예산

| 작업 | 예산 | 비고 |
|---|---|---|
| `GET /api/ai-coach` (최신 조회) | **50ms** | 인덱스 승격 후 |
| `GET /api/coach/detail` (조립) | **400ms** | 추천 + 성적표 + 실패이력 + 익절 + 행동 |
| **`GET /api/signal-performance`** | **300ms** | **현재 200 쿼리 → 3 쿼리** |
| `GET /api/coach/scoreboard` (그룹) | 300ms | |
| `GET /api/profit-plan` | 150ms | 보유 종목별 |
| `GET /api/behavior-coach` | 200ms | 거래 집계 |
| `POST /api/trade-preflight` | 100ms | 계산만 |
| `POST /api/ai-coach/feedback` | 50ms | upsert |
| `GET /api/coach/generation-status` | **20ms** | 인덱스 1회 |
| **`POST /api/ai-coach/generate`** | **6s (p95) · 비동기** | LLM 포함. **동기로 만들지 않는다** |
| `POST /api/ai-coach/explain` | 6s · 5분 캐시 | |

## 병목 1 — 성적표 N+1 (가장 큰 개선)

현재: insight 100건 × `PriceHistory` 2회 = **200 쿼리**.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | insight를 1회 조회한다(`kind` 컬럼 조건, 인덱스) | Must |
| FR-2 | 심볼 집합을 모아 **최신가를 심볼당 1회** 조회한다 | Must |
| FR-3 | `entry` 가격을 **범위 조회 1회**로 받는다 | Must |
| FR-4 | **목표 쿼리 3회.** 개선 전/후 쿼리 수를 `log: ['query']`로 측정해 기록한다 | Must |
| FR-5 | `signalType` 그룹 집계를 DB에서 한다. 애플리케이션 루프 0건 | Must |
| FR-6 | 개선 전/후 p95를 측정해 기록한다 | Must |

## 병목 2 — LLM

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 추천 생성은 **비동기**다. `POST /generate`가 202를 반환하거나, 워커가 만든 것을 조회한다 | Must |
| FR-11 | **LLM 호출을 트랜잭션 밖**에서 한다. 수십 초가 커넥션을 잡으면 서버가 멈춘다 | Must |
| FR-12 | 해설을 **생성 시 1회** 만들어 저장한다. 조회마다 부르지 않는다 | Must |
| FR-13 | LLM 타임아웃을 둔다(기본 20s). 초과 시 규칙 문장으로 폴백 | Must |
| FR-14 | 재시도는 지수 백오프 **2회**. LLM 재시도가 비용이다 | Must |
| FR-15 | **LLM 워커를 다른 워커와 같은 큐에 넣지 않는다.** 우리 워커는 단일 워커 성향이라 앞의 것이 수십 초를 잡으면 뒤가 전부 밀린다 | Must |
| FR-16 | LLM 성공률·지연을 측정한다. **폴백 비율이 높으면 프롬프트 문제**다 | Must |
| FR-17 | `explain` 5분 캐시를 유지한다. rate limit도 둔다 | Must |

## 쿨다운 — 비용 방어

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 수동 재생성 **5분 쿨다운**. 판정은 `CoachGenerationLog` 인덱스 1회(20ms) | Must |
| FR-21 | **실패·거부 요청도 로그에 남긴다.** 실패를 빌미로 무한 재시도하면 LLM 비용이 폭발한다 | Must |
| FR-22 | 쿨다운 초과 시 429 + `retryAfterSeconds` | Must |
| FR-23 | 쿨다운이 설정값이다 | Must |
| FR-24 | `CoachGenerationLog` 보존 정책을 정한다. 쿨다운만 필요하면 최근 1건이면 되지만 관측성을 위해 이력이 필요하다 | Must |

## 조립 (`/coach/detail`)

소스가 6개다: 추천 · 성적표 · 실패이력 · 익절 · 행동 · 후보.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 6개를 **병렬**로 조회한다. `await` 연쇄 0건 | Must |
| FR-31 | 하나가 실패하면 **그 필드만 `null`** 이고 나머지가 응답한다 | Must |
| FR-32 | 단, **성적표·실패이력 실패는 `renderable: false`** 로 이어진다. 그건 정상 동작이다 | Must |
| FR-33 | 조립 1회의 **쿼리 수가 15개 이하**다 | Must |
| FR-34 | Projection 4개를 쓴다(`DB-REQ-020` FR-30) | Must |

## 인덱스 의존

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `@@index([userId, type, createdAt DESC])`가 최신 조회를 덮는다 | Must |
| FR-41 | `@@index([userId, kind, createdAt DESC])`가 성적표 조회를 덮는다 | Must |
| FR-42 | `@@index([userId, signalType, createdAt DESC])`가 그룹 조회를 덮는다 | Must |
| FR-43 | `CoachGenerationLog @@index([userId, requestedAt DESC])`가 쿨다운을 덮는다 | Must |
| FR-44 | `EXPLAIN` 결과를 checklist에 첨부한다. **`Seq Scan` on `investment_insights` 0건** | Must |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `payload` 전체를 응답에 담지 않는다. 필요한 필드만 | Must |
| FR-51 | 성적표 샘플을 20건까지만 | Must |
| FR-52 | 실패 이력을 최근 3건까지만 | Should |
| FR-53 | 후보를 상위 3개까지만 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정: **게이트 렌더/미렌더(사유별)**, **LLM 성공률·지연·폴백률**, 성적표 쿼리 수·지연, 재생성 호출 수·쿨다운 거부 수, 피드백 분포, 조립 지연 | Must |
| FR-61 | **게이트 미렌더 사유별 카운터가 가장 중요하다.** 초기에 대부분 차단될 수 있고, 그 사실을 숫자로 봐야 정책을 정할 수 있다 | Must |
| FR-62 | **프롬프트·응답을 로깅하지 않는다.** 토큰 수와 지연만 | Must |
| FR-63 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] **성적표 쿼리 수가 200 → 3 이하다** (개선 전/후 측정값 기록)
- [ ] 최신가가 심볼당 1회 조회된다
- [ ] `signalType` 그룹 집계가 DB에서 일어난다
- [ ] `GET /api/signal-performance` p95 < 300ms (측정값 기록)
- [ ] `GET /api/ai-coach` 최신 조회 < 50ms
- [ ] `GET /api/coach/detail` p95 < 400ms (측정값 기록)
- [ ] 조립 1회 쿼리 수 ≤ 15
- [ ] 조립 6개 소스가 병렬이다 (`await` 연쇄 0건)
- [ ] 소스 하나 실패 시 그 필드만 `null`이고 나머지가 응답한다
- [ ] 성적표·실패이력 실패가 `renderable: false`로 이어진다
- [ ] 추천 생성이 비동기다 (동기 6s 응답 0건)
- [ ] **LLM 호출이 트랜잭션 밖이다**
- [ ] 해설이 생성 시 1회만 만들어진다 (호출 카운터)
- [ ] LLM 타임아웃 20s + 재시도 2회가 설정되어 있다
- [ ] **LLM 워커가 다른 워커와 다른 큐에 있다**
- [ ] LLM 성공률·폴백률이 측정된다
- [ ] `explain`에 5분 캐시 + rate limit이 있다
- [ ] **5분 내 재생성이 429 + `retryAfterSeconds`다**
- [ ] 쿨다운 판정이 20ms 이내다
- [ ] 실패·거부 요청이 로그에 남는다
- [ ] `CoachGenerationLog` 보존 정책이 있다
- [ ] 인덱스 4개의 `EXPLAIN`이 checklist에 있고 `Seq Scan`이 0건이다
- [ ] `payload` 전체가 응답에 담기지 않는다
- [ ] 성적표 샘플 ≤ 20, 후보 ≤ 3이다
- [ ] **게이트 미렌더 사유별 카운터가 있다**
- [ ] 프롬프트·응답 로깅이 0건이다

## Dependencies

- **선행:** `SRV-REQ-024`~`026` · `DB-REQ-020`(DB 성능)
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- **성적표 표본이 실제로 몇 건인지.** 표본이 거의 없으면 개선 효과(200 → 3)가 작고, 대신 게이트가 대부분 차단된다 → **표본 실측이 F004의 첫 작업**이어야 한다.
- LLM 타임아웃 20s가 적절한가. Gemini 응답 시간을 실측해야 한다.
- `entry` 조회를 범위 1회로 합칠 수 있는가(`DB-REQ-020` Open Question).
- 추천 생성을 워커만 하게 하고 **수동 재생성을 없앨지.** 그러면 쿨다운·429·로그가 전부 불필요해진다 → 사용자 ≤10명이면 워커 주기(6시간)로 충분할 수 있다.
