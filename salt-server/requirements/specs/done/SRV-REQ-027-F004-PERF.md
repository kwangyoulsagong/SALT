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

> **v2 대체 (2026-11-10, `FEATURE-017` v2 · `ADR-010` v2)** — 종목 판단은 숨기지 않는다: 판단 · 관측 · 성적 · 실패사례는 늘 나가고 예전 막힘 사유는 꼬리표 `caveats[]`. 3종은 늘 다 있어야 한다 — 비면 막지 않고 과거 검산으로 채운다. 이 문서에서 바뀐 FR: FR-32 (아래 그 자리에 표시). 저장 추천 카드 게이트 · 전망 게이트는 그대로.

> **2026-10-29 전수 조사 — 아래 본문 중 지금과 다른 것** (본문은 당시 기록으로 둔다)
> - FR-10 비동기 202 · FR-20~23 쿨다운 429 + `retryAfterSeconds` · FR-43 `coach_generation_logs (user_id, requested_at DESC)` 인덱스는 구현됨 — 측정 FR 만 남음
> - FR-1~6 의 N+1 전제는 지난 일 · FR-32 실패사례 출처는 스냅샷 원장


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
| `POST /api/ai-coach/explain` | 6s · 5분 캐시 | 판단 미렌더면 LLM 없이 **50ms** (2026-09-21) |
| **`GET /api/ai-coach?symbol&mode`** (종목 판단, 2026-09-21) | **150ms** | 두 모드 × (판단 · 게이트 · 성적표 · 실패 이력 · 구간) + 게이지 적중률 |
| `symbol-judgment-snapshot` 워커 | 1회 실행 < 30s | 추적 자산 ≤ 10 + 보유, 사용자 ≤ 10 |
| `gauge-track-record` 워커 | 종목당 < 5s | 일 1회 |

## 병목 1 — 성적표 N+1 (가장 큰 개선)

현재: insight 100건 × `PriceHistory` 2회 = **200 쿼리**.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | insight를 1회 조회한다(`kind` 컬럼 조건, 인덱스) | Must |
| FR-2 | 심볼 집합을 모아 **최신가를 심볼당 1회** 조회한다 | Must |
| FR-3 | `entry` 가격을 **범위 조회 1회**로 받는다 | Must |
| FR-4 | ~~**목표 쿼리 3회.**~~ **정정 2026-11-19:** 쿼리 수를 측정해 기록한다 — 실측 6 · p95 1.8ms(원장 집계 · 아래 정리 절). 개선 전/후 쿼리 수를 `log: ['query']`로 측정해 기록한다 | Must |
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
| FR-32 | 단, ~~**성적표·실패이력 실패는 `renderable: false`** 로 이어진다. 그건 정상 동작이다~~ **v2(11-10):** 종목 판단은 나가고 꼬리표 `track_record_unavailable`(결함으로 센다) — 저장 추천 게이트는 그대로 (`FEATURE-017` v2) | Must |
| FR-33 | 조립 1회의 **쿼리 수가 15개 이하**다 | Must |
| FR-34 | Projection 4개를 쓴다(`DB-REQ-020` FR-30) | Must |

## 종목 판단 경로 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · B9 · B10. 투자 화면에서
행을 고를 때마다 불린다 — **코치 탭보다 호출 빈도가 한 자릿수 높다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 종목 판단 p95 **150ms**, ~~쿼리 **10개 이하**~~ **정정 2026-11-19:** 쿼리 상한 없음 — 실측 16 · 20(v2 3종 채우기 `recentCases` 4 포함), p95 4.2ms(`DB-REQ-020` FR-70) | Must |
| FR-71 | 두 모드를 **한 번에** 계산한다. 모드 전환이 서버 호출을 만들지 않는다 | Must |
| FR-72 | 조립 소스(시세 · 보유 · 심리 · 지표 · 대량 체결 · 성적표 · 실패 이력 · 구간 × 2 · 게이지 적중률)를 **병렬**로. `await` 연쇄 0건 | Must |
| FR-73 | 관찰 구간은 (symbol, mode, 버킷) 메모리 캐시(단타 5분 · 장기 1시간). 사용자 무관 값이다 | Should |
| FR-74 | 게이지 적중률은 **요청 시 집계 0건** — 사전 집계 읽기 1회 | Must |
| FR-75 | `explain` 이 판단 미렌더일 때 LLM 을 부르지 않으므로 **초기(표본 0) 상태의 LLM 비용이 0** 이다. 이것을 관측 지표로 남긴다 | Must |
| FR-76 | 스냅샷 워커 · 게이지 워커는 LLM 워커와 **다른 큐**다(FR-15). 서로 같은 큐여도 되지만 LLM 뒤에 서지 않는다 | Must |
| FR-77 | 관측: 종목 판단 p95 · 쿼리 수, **경로 · 모드별 게이트 미렌더율**, 구간 `unavailable` 사유별 비율, 게이지 `lowSample` 비율, 스냅샷 워커 소요 | Must |

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
- [ ] 성적표·실패이력 실패가 ~~`renderable: false`로 이어진다~~ **v2(11-10):** 종목 판단은 꼬리표 `track_record_unavailable` (`FEATURE-017` v2)
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
- [ ] 종목 판단 p95 < 150ms · 쿼리 ≤ 10 (측정값 기록)
- [ ] 모드 전환이 서버 호출 0건이다
- [ ] 종목 판단 조립이 병렬이다 (`await` 연쇄 0건)
- [ ] 게이지 적중률 요청 시 집계가 0건이다
- [ ] 판단 미렌더일 때 `explain` 의 LLM 호출이 0건이다
- [ ] 스냅샷 · 게이지 워커가 LLM 큐 뒤에 서지 않는다
- [ ] 경로 · 모드별 게이트 미렌더율과 구간 `unavailable` 사유 비율이 측정된다

## Dependencies

- **선행:** `SRV-REQ-024`~`026` · `DB-REQ-020`(DB 성능)
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- **성적표 표본이 실제로 몇 건인지.** 표본이 거의 없으면 개선 효과(200 → 3)가 작고, 대신 게이트가 대부분 차단된다 → **표본 실측이 F004의 첫 작업**이어야 한다.
- LLM 타임아웃 20s가 적절한가. Gemini 응답 시간을 실측해야 한다.
- `entry` 조회를 범위 1회로 합칠 수 있는가(`DB-REQ-020` Open Question).
- 추천 생성을 워커만 하게 하고 **수동 재생성을 없앨지.** 그러면 쿨다운·429·로그가 전부 불필요해진다 → 사용자 ≤10명이면 워커 주기(6시간)로 충분할 수 있다.
- 종목 판단 150ms 예산이 **두 모드 × 구간 계산**을 담는가. 못 담으면 구간을 사전 계산(스냅샷 워커)으로 옮긴다.

## 정리 2026-11-19 — FR 대조 (`WEB-perf-req-close-slice.md`)

루트 `requirements/specs/done/WEB-perf-req-close-slice.md`(브랜치 `feat/web-perf-close`). FR 마다 코드로 대조했다 — 9월 본문의 두 병목(성적표 N+1 · 생성 LLM)은 둘 다 사라졌다.
실측은 워커 없는 임시 서버 4020(`PRISMA_LOG_QUERIES=1` 로 요청당 쿼리 줄을 셈) · 임시 BFF 4011, 예열 2회 뒤 10~20회 순차, 측정 뒤 임시 계정 지움.
~~**남은 것: FR-4 · 6 · 70 · 73 · 77 의 측정 몫과 예산 표의 `GET /api/ai-coach` · `scoreboard` 행** — 이번에 재지 않았다(임시 계정 지움). 그래서 to-do → in-progress, done 아님.~~
**2회차(같은 날)** — 남은 측정을 새 임시 계정으로 쟀다(서버 직접 · 예열 2 뒤 20회 · 쿼리는 예열 뒤 한 번 · 측정 뒤 계정 지움). 쿼리 상한 둘(FR-4 · 70)은 정정, 대시보드는 `OPS-001` 로. 판단은 루트 슬라이스 판단 9. **남은 FR 없음 → done.**

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 2 · 3 · 5 | 대체 | 성적표가 추천 스냅샷 원장으로 바뀌어 N+1 경로가 없다(`SRV-REQ-024` FR-176). `GetSignalPerformance.ts:36-39` 병렬 2호출 · 집계는 DB(`PrismaRecommendationSnapshotStore.ts:110-125` aggregate · count) |
| FR-4 | 정정 · 측정 충족(2회차) | 목표 쿼리 3 → 정정. 실측 `GET /api/signal-performance` 쿼리 **6**(원장 aggregate 1 · count 4 · `recentCases` 1) · p95 1.8ms — 3으로 줄여 얻을 지연이 없다 |
| FR-6 | 측정 충족(2회차) | `signal-performance` p50 0.8 / p95 **1.8ms**(예산 300ms) |
| FR-10 | 충족 | `RequestCoachGeneration.ts:42-66` 202 · 뒤에서 생성(`void this.generate` :57) |
| FR-11 · 13 · 14 · 15 · 16 | 대체 | 저장 추천 생성은 LLM 을 부르지 않는다 — `GenerateCoachRecommendation.ts:66`(`llmSource` 늘 `rule`) · 트랜잭션 없음(:68). LLM 성공률 · 지연은 `LlmCallLog`(schema.prisma:532) |
| FR-12 · 17 | 대체 | 요청 경로 해설 LLM 0 — 배치가 미리 만든 저장본 읽기(`GenerateExplanationSnapshots.ts:62` · `aiCoach.routes.ts:11-16`, F017 v2 단계 3 · `SRV-REQ-053`). 옛 `explain` 경로 삭제 |
| FR-20 | 측정 충족 | 쿨다운 판정 = `(user_id, requested_at DESC)` 인덱스 1회(`PrismaCoachGenerationLogStore.ts` `lastAcceptedManualAt`). 같은 인덱스를 읽는 `generation-status` 쿼리 2 · 서버 p95 1.0ms · BFF p95 1.6ms |
| FR-21 | 충족 | 거부도 기록 — `RequestCoachGeneration.ts:49` → `recordRejected`(`cooldown_rejected`) · 실패는 `GenerateCoachRecommendation` 이 `failed` 로 닫음 |
| FR-22 | 충족 | 429 + `retryAfterSeconds`(`RequestCoachGeneration.ts:48-51`, 슬라이스 13) |
| FR-23 | 충족 | `env.ts:124` `COACH_REGENERATE_COOLDOWN_SECONDS`(기본 300) |
| FR-24 | 충족(2026-11-19) | 보존 90일 — `GenerateCoachRecommendation.ts:75` `COACH_GENERATION_LOG_KEEP_DAYS` · 생성이 끝날 때마다 `pruneBefore`(:124-127, cron 0 · 실패해도 생성 계속) · `PrismaCoachGenerationLogStore.pruneBefore`. 시험 `generateCoachLogging.test.ts:99` 외 1 · 실 DB(100일 전 1건만 지움) |
| FR-30 | 충족(2026-11-19) | `GetCoachDetail.ts:96` 첫 묶음 병렬 · `:109` 변동성 · 추천 카드도 `Promise.all`(전엔 두 await 연쇄) |
| FR-31 | 충족 | 소스마다 `.catch` 폴백(`GetCoachDetail.ts` 행동 · 변동성 · 국내 표본) |
| FR-32 | 대체 | v2 — 종목 판단은 꼬리표 `caveats[]`(`FEATURE-017` v2 · `ADR-010` v2) |
| FR-33 | 측정 충족 | coach detail 쿼리 **11**(≤ 15) · 서버 p50 3.2 / p95 **5.0ms** · BFF p50 4.5 / p95 9.1ms(예산 400ms) |
| FR-34 | 대체 | Projection 4개 전제(`DB-REQ-020` FR-30)가 원장 · 저장소 메서드로 대체 |
| FR-40 · 41 · 42 · 44 | 대체 | 컬럼 승격을 하지 않았다 — `ai_coach` 는 사용자당 `main_coach` 한 행 upsert(표 45행). 성적표 인덱스는 원장 표에(schema.prisma:621-623 · 662-669) |
| FR-43 | 충족 | schema.prisma:526 `@@index([userId, requestedAt(sort: Desc)])` |
| FR-50 | 충족 | 상세는 필요한 필드만 매핑(`GetCoachDetail.ts` 반환부) |
| FR-51 · 52 · 53 | 충족 | `PERFORMANCE_SAMPLE_LIMIT = 20`(`policy/signalPerformance.ts:37`) · `JUDGMENT_CASE_LIMIT = 3`(`policy/symbolJudgment.ts:126`) · `DETAIL_CANDIDATE_LIMIT = 3`(`policy/coachDetail.ts:197`) |
| FR-60 · 61 | 충족(기록) · 범위 이동(대시보드 → `OPS-001`) | 카운터의 원본은 행으로 남는다 — 3종 결함 10분 줄(`ReportTriadGaps` · `app.ts:48-49`, v2 에서 "미렌더" 대신 결함) · `coach_generation_logs` 상태(재생성 · 쿨다운 거부) · `LlmCallLog`. 보내고 보는 대시보드는 배포가 없어 `OPS-001` 로 |
| FR-62 | 충족 | `LlmCallLog` 는 토큰 수 · 지연만(schema.prisma:532~) |
| FR-63 | 충족 | 루트 슬라이스 실측 표가 수치 기록 |
| FR-70 | 측정 충족(지연) · 정정(쿼리 상한) | `?symbol=BTC` 쿼리 16 · p50 3.0 / p95 **4.2ms** · `&mode=long_term` 16 · 2.1 / 2.7ms · `?symbol=005930` 20 · 3.4 / 4.1ms(응답 5.9~6.8 kB) — 예산 150ms 의 3%. 쿼리 구성: 판단 스냅샷 4(모드마다 맞은 · 빗나간 사례 `recentCases` — `ADR-010` v2 3종 채우기) · 시세 자산 2 · 원시 SQL 5(전망 뷰 등) · 심리 · 고래 · 프로필 · 보유 각 1. 상한 10 은 v2 이전 설계 — 줄이려면 동결된 3종 로더를 고쳐야 하고 얻는 지연이 없어 정정. `DB-REQ-020` FR-70 이 이리로 합쳐졌다 |
| FR-71 · 72 | 충족 | `GetSymbolCoach.ts:192-193` 두 모드 · 구간 · 게이지 한 `Promise.all` · 재료는 `:147` 병렬 |
| FR-73 | 측정상 불필요(2회차) | 구간 메모리 캐시 없음 — 종목 판단 p95 4.2ms 라 캐시로 얻을 것이 없다. `DB-REQ-020` FR-72 가 이리로 |
| FR-74 | 충족 | 게이지는 저장값 읽기(`GetSymbolCoach.ts:132-134`) · 집계는 일 1회 워커 한 쿼리(`RefreshGaugeTrackRecords.ts:28-32`) |
| FR-75 | 대체 | 요청 경로 LLM 0(FR-12 와 같음) |
| FR-76 | 충족 | 게이지 · 스냅샷은 cron(`investment-insight.worker.ts:83`) — LLM 큐가 없다 |
| FR-77 | 측정 충족(p95 · 쿼리 수) · 범위 이동(대시보드 → `OPS-001`) | 종목 판단 p95 · 쿼리 수는 FR-70 행. 미렌더율 · `unavailable` 비율 · `lowSample` 비율 · 스냅샷 워커 소요를 보내고 보는 곳은 배포가 없어 `OPS-001` |
| 예산 `GET /api/ai-coach` 50ms · `scoreboard` 300ms | 측정 충족(2회차) | 최신 조회 쿼리 1 · p50 0.6 / p95 **0.8ms** · 성적표 쿼리 6 · 서버 p50 23.5 / p95 **26.8ms** · BFF 25.1 / 27.5ms |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. 예산에 종목 판단 · 두 워커 추가, `explain` 미렌더 경로 50ms. 신규 FR-70~77(두 모드 1회 계산 · 병렬 조립 · 게이지 사전 집계(B9) · 초기 LLM 비용 0 · 경로별 미렌더율 관측) |
| 2026-10-29 | 전수 조사 — 현재와 다른 서술 정정(머리 블록). 본문은 당시 기록으로 둠 |
| 2026-11-10 | v2 대체 표시 — FR-32 (`FEATURE-017` v2 · `ADR-010` v2) |
| 2026-11-19 | FR 대조 정리(`WEB-perf-req-close-slice.md`) — 충족 · 대체 · 측정 충족 표. 이번 코드: 생성 기록 보존 90일(FR-24) · 상세 두 await 병렬(FR-30). 실측 coach detail 쿼리 11 · p95 5.0ms(FR-33) · generation-status p95 1.0ms(FR-20). `DB-REQ-020` FR-70 · 72 · 지연 수용 기준을 FR-70 · 73 · 6 으로 받음. 관측 대시보드는 `OPS-001` 로. 남은 측정(FR-4 · 6 · 70 · 73 · 77 · 예산 두 행) 때문에 to-do → **in-progress** |
| 2026-11-19 | 2회차 실측(`WEB-perf-req-close-slice.md` 판단 9) — 종목 판단 p95 4.2ms(쿼리 16 · 20) · `signal-performance` 쿼리 6 · p95 1.8ms · 최신 조회 0.8ms · 성적표 26.8ms. FR-4 · FR-70 쿼리 상한 정정(행에 정정 표기) · FR-6 · 70 지연 · 예산 표 측정 충족 · FR-73 측정상 불필요. FR-60 · 61 · 77 대시보드 · 관측은 **`OPS-001`** 로 범위 이동. 남은 FR 없음 → in-progress → **done** |
