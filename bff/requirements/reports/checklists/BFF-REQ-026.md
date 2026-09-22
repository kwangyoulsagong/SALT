# BFF-REQ-026 (F004 PERF) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-026-F004-PERF.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-bff-symbol-judgment.md`
- **2026-09-22 슬라이스 5** (`feat/f004-bff-slice4`): 서버 4xx 전달 · `explain` 인증 · GET 재시도 — 루트 `checklists/F004-bff-upstream-errors.md`

## 1. 종목 판단 경로 (FR-50~54)

| FR | 판정 | 실측 · 근거 |
|---|---|---|
| FR-50 p95 200ms · 병렬 | **pass** | 로컬 BTC 100회(워밍 후) p50 7ms · **p95 32ms** · max 74ms. 서버 직접 p95 33ms. tsx 재기동 직후 40회는 p95 344ms — 첫 호출 워밍, 기록만 |
| FR-51 모드 전환 무호출 | pass | 두 모드 한 응답 |
| FR-52 클라이언트 종료 → upstream 취소 | pass (코드) | `res.on('close')` → `AbortController`. **실측 안 함** |
| FR-53 새 캐시 0건 | pass | |
| FR-54 p95 · 호출률 · 모드별 미렌더율 · news degraded 비율 관측 | 미충족 | 관측 인프라 미정 |

## 2. 나머지

| FR | 판정 | 비고 |
|---|---|---|
| FR-1 `explain` 동시 2 | pass | 슬라이스 5 — 초과는 대기열 없이 429 `explain_busy`. 실측 3건 동시 → 1건 429(20ms) |
| FR-2 · FR-3 `explain` 20s · 재시도 0 | pass | 슬라이스 5 |
| FR-4 `generate` 202 · 1s | 미충족 | 서버가 동기 LLM 호출 |
| FR-5 LLM 경로 커넥션 별도 측정 | 미충족 | 관측 인프라 미정 |
| FR-6 프론트 디바운스 | 해당 없음 (BFF) | 해설 버튼이 아직 없다 — FE 상세 분석 페이지 |
| FR-10~13 `/coach/report` 서버 1회 | 미착수 | |
| FR-20~21 BFF 캐시 0건 | pass | 이 브랜치가 추가한 캐시 없음 |
| FR-30~32 응답 크기 | 부분 | 뉴스에서 `summary` · `sentiment` 를 빼 줄였다. 리포트 경로는 미착수 |
| FR-40~45 게이트 카운터 · LLM 관측 | 미착수 | FR-45 before/after — 새 경로라 before 없음 |
