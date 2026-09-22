# BFF-REQ-025 (F004 UPSTREAM) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-025-F004-UPSTREAM.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-bff-symbol-judgment.md`

## 1. 호출 맵

| BFF 함수 | 타임아웃 | 재시도 | 판정 |
|---|---|---|---|
| `symbolCoach` `GET /api/ai-coach?symbol&mode` | 300ms | 1회 요구 | 타임아웃 pass · **재시도 미충족** |
| `symbolNews` `GET /api/market-intelligence/:symbol/news` | 300ms | 1회 요구 | 타임아웃 pass · **재시도 미충족** · 병렬 pass |
| 나머지 12개 | — | — | 미착수 |

## 2. 종목 판단 경로 (FR-40~46)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-40 모드 `renderable` 누락 → 그 모드 unavailable | pass | `null` + `degradedFields` |
| FR-41 BFF 가 먼저 `confidence` 미사용 | pass | 서버는 이미 보내지 않는다(`ModeDecision` 에 없음) — 순서 문제 없음 |
| FR-42 병렬 | pass | `Promise.allSettled` |
| FR-43 `mode` 없으면 안 보냄 | pass | |
| FR-44 `explain` `renderable: false` 200 | 미착수 | |
| FR-45 계약 스냅샷 | pass | `symbol-coach.viewmodel.test.ts` 최상위 키 · `zone.kind` · `confidence` 부재 |
| FR-46 관심 종목 호출에 코치 호출 섞지 않음 | pass | 무변경 |

## 3. 나머지

| FR | 판정 | 비고 |
|---|---|---|
| FR-1~7 LLM 경로 타임아웃 · 재시도 · 429 · 동시 2 | 미착수 | 429 전달 전에 에러 미들웨어의 4xx → 500 변환을 고쳐야 한다 |
| FR-10~12 `explain` 토큰 전달 | 미착수 | |
| FR-20 `renderable` 없으면 unavailable | pass (종목 경로) | |
| FR-21 기본값 만들지 않음 | pass | 성적표가 없으면 `trackSample: null` |
| FR-22 `disclaimer` 없으면 unavailable | pass | 502 `coach_unavailable` |
| FR-23 `scoreNote` 없으면 unavailable | pass (모드 단위) | 없는 모드는 `null` |
| FR-24 게이트 3필드 스냅샷 | 부분 | 종목 경로의 `renderable` 만. `signalTrackRecord` · `failureCases` 는 리포트 경로 |
| FR-30~35 하지 않는 것 | pass | LLM · 점수 · 게이트 판정 · 주문 · 로깅 0건 |
