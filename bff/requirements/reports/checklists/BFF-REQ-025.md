# BFF-REQ-025 (F004 UPSTREAM) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-025-F004-UPSTREAM.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-bff-symbol-judgment.md`
- **2026-09-22 슬라이스 5** (`feat/f004-bff-slice4`): 서버 4xx 전달 · `explain` 인증 · GET 재시도 — 루트 `checklists/F004-bff-upstream-errors.md`

## 1. 호출 맵

| BFF 함수 | 타임아웃 | 재시도 | 판정 |
|---|---|---|---|
| `symbolCoach` `GET /api/ai-coach?symbol&mode` | 300ms | 1회 요구 | 타임아웃 pass · 재시도 pass (슬라이스 5) |
| `symbolNews` `GET /api/market-intelligence/:symbol/news` | 300ms | 1회 요구 | 타임아웃 pass · 재시도 pass (슬라이스 5) · 병렬 pass |
| `coachPreview` | 기본 10s | 1회 | 재시도 pass · **타임아웃 400ms 미적용** |
| `explain` | 20s | 0회 | pass (슬라이스 5) |
| `generate` | 1s | 0회 | **pass** (2026-09-23) — 서버가 202 를 바로 준다(서버 슬라이스 13). 실측 8.5ms |
| `coachReport` | 800ms | 1회 | **pass** (2026-09-23) |
| `generationStatus` | 300ms | 1회 | **pass** (2026-09-23) |
| 나머지 7개 | — | — | 미착수 (`scoreboard` · `profile` · `feedback` · `profitPlan` · `signalPerformance` · `preflight` · `behaviorCoach` 는 기본 10s) |

## 2. 종목 판단 경로 (FR-40~46)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-40 모드 `renderable` 누락 → 그 모드 unavailable | pass | `null` + `degradedFields` |
| FR-41 BFF 가 먼저 `confidence` 미사용 | pass | 서버는 이미 보내지 않는다(`ModeDecision` 에 없음) — 순서 문제 없음 |
| FR-42 병렬 | pass | `Promise.allSettled` |
| FR-43 `mode` 없으면 안 보냄 | pass | |
| FR-44 `explain` `renderable: false` 200 | pass | 슬라이스 5 테스트 |
| FR-45 계약 스냅샷 | pass | `symbol-coach.viewmodel.test.ts` 최상위 키 · `zone.kind` · `confidence` 부재 |
| FR-46 관심 종목 호출에 코치 호출 섞지 않음 | pass | 무변경 |

## 3. 나머지

| FR | 판정 | 비고 |
|---|---|---|
| FR-1 · FR-2 `explain` 20s · 재시도 0 | pass | 슬라이스 5 |
| FR-3 · FR-4 `generate` 1s · 202 계약 테스트 | **pass** (2026-09-23) | 1s 예산 · 202 무가공 · 실측 8.5ms. FR-4 의 계약 테스트는 **실측으로 대신했다** — 1s 를 넘기면 BFF 가 끊어 500 이 나고 그것이 계약 위반 신호다 |
| FR-5 mutation 재시도 0 | pass | 재시도 유틸은 GET 호출부에만 |
| FR-6 `429` + `Retry-After` · `422` · `401` 전달 | pass | 슬라이스 5 — error middleware. 실측 main 500 → 401 · 400. `Retry-After` 는 서버가 아직 안 보낸다 → 2026-09-23 BFF 경유 실측 429 · `Retry-After: 300` · 본문 `retryAfterSeconds` 까지(본문 필드는 이번에 고쳤다) |
| FR-7 동시 `explain` 2 | pass | 실측 3건 동시 → 1건 429 `explain_busy` |
| FR-10~12 `explain` 토큰 전달 | pass | 슬라이스 5. FR-11 BFF 먼저 — 서버는 아직 공개(토큰 무시) |
| FR-20 `renderable` 없으면 unavailable | pass (종목 경로) | |
| FR-21 기본값 만들지 않음 | pass | 성적표가 없으면 `trackSample: null` |
| FR-22 `disclaimer` 없으면 unavailable | pass | 502 `coach_unavailable` |
| FR-23 `scoreNote` 없으면 unavailable | pass (모드 단위) | 없는 모드는 `null` |
| FR-24 게이트 3필드 스냅샷 | 부분 | 종목 경로의 `renderable` 만. `signalTrackRecord` · `failureCases` 는 리포트 경로 |
| FR-30~35 하지 않는 것 | pass | LLM · 점수 · 게이트 판정 · 주문 · 로깅 0건 |

## 2026-09-22 — 서버가 explain 인증을 켰다 (F004 슬라이스 10)

BFF 변경 0. 슬라이스 5 에서 먼저 넣은 토큰 전달 · `AbortSignal` · `renderable:false` 200 통과가 그대로 맞았다 —
실측 BFF 경유 `POST /api/app/ai-coach/explain` 200 `{renderable:false}`, 서버 직접 무토큰 401.
preflight `stopLossRate` · `maxLossOfTotalRate` 도 `calculation` 통째 전달이라 변경 0(실측 BFF 경유 200).
