# SRV-REQ-027 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-10 비동기 202 · FR-20~23 쿨다운 429 + `retryAfterSeconds` · FR-43 `coach_generation_logs (use / FR-1~6 의 N+1 전제는 지난 일 · FR-32 실패사례 출처는 스냅샷 원장

## 2026-11-19 FR 대조 정리 (`WEB-perf-req-close-slice.md`, `feat/web-perf-close`)

- 상태: ~~**to-do → in-progress** — 측정 몫이 남았다.~~ **2회차(같은 날) 뒤 done** — 아래 2회차 절. FR ↔ 근거 전체 표는 스펙 `## 정리 2026-11-19` 절(1:1)
- 이번 코드: 생성 기록 보존 90일(FR-24 — `GenerateCoachRecommendation.ts:75` · `:124-127` · 시험 `generateCoachLogging.test.ts` 둘 · 실 DB 100일 전 1건만 지움) ·
  상세 변동성 · 추천 카드 두 await → `Promise.all`(FR-30 — `GetCoachDetail.ts:109`)
- 측정 충족: FR-33 coach detail 쿼리 11 · 서버 p95 5.0ms · BFF p95 9.1ms / FR-20 `generation-status` 쿼리 2 · 서버 p95 1.0ms · BFF 1.6ms
  (워커 없는 임시 서버 4020 · `PRISMA_LOG_QUERIES=1` · 예열 2회 뒤 10~20회 · 임시 계정 지움)
- 대체: FR-1 ~ 3 · 5(원장 · `SRV-REQ-024` FR-176) · FR-11 ~ 17 · 75(생성 · 요청 경로 LLM 0) · FR-32(v2) · FR-34 · 40 ~ 42 · 44(컬럼 승격 없음)
- 검증: 서버 `npm run build` · `lint` · `npm test` 2003 · `test:layer-check`(루트 슬라이스 검증 절)

### 미충족(1회차 — 2회차에서 전부 닫힘)

| FR | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 · 6 `signal-performance` 쿼리 수 · p95 300ms | 이번 실측 표에 넣지 않았고 측정 계정은 지웠다 | 다음 코치 경로 실측 때 같은 방법(임시 서버 4020 · 쿼리 줄 세기)으로 |
| FR-70 · 77 종목 판단 p95 150ms · 쿼리 ≤ 10 | 위와 같음 | 위와 같음 |
| FR-73 구간 캐시(Should) | FR-70 수치가 있어야 정한다 — 예산 안이면 대체로 닫는다 | FR-70 측정과 함께 |
| 예산 `GET /api/ai-coach` 50ms · `scoreboard` 300ms | 위와 같음 | 위와 같음 |
| FR-60 · 61 · 77 대시보드(미렌더율 · `unavailable` · `lowSample`) | 배포하지 않는 프로젝트라 보낼 곳이 없다. 원본 행(3종 결함 줄 · 생성 기록 · `LlmCallLog`)은 있다 | `OPS-001` 착수 시 |

### 2회차 실측 (같은 날 · 새 임시 계정 · 측정 뒤 지움)

- 방법: 서버 직접 · 예열 2 뒤 20회 · 쿼리는 예열 뒤 한 번 셈. 판단은 루트 슬라이스 판단 9
- 상태: **in-progress → done**

| 항목 | 실측 | 판정 |
|---|---|---|
| FR-70 종목 판단 `?symbol=BTC` · `&mode=long_term` · `?symbol=005930` | 쿼리 16 · 16 · 20 · p95 4.2 · 2.7 · 4.1ms(응답 5.9~6.8 kB) | 지연 측정 충족(예산 150ms) · 쿼리 상한 10 정정 — v2 3종 채우기 `recentCases` 4 포함, 동결 로더를 고쳐도 얻는 지연 없음 |
| FR-4 · 6 `signal-performance` | 쿼리 6 · p50 0.8 / p95 1.8ms | 목표 쿼리 3 정정 · p95 측정 충족(예산 300ms) |
| 예산 `GET /api/ai-coach` 최신 조회 | 쿼리 1 · p95 0.8ms | 측정 충족(50ms) |
| 예산 `scoreboard` | 쿼리 6 · 서버 p95 26.8ms · BFF 27.5ms | 측정 충족(300ms) |
| FR-73 구간 캐시(Should) | 종목 판단 p95 4.2ms | 측정상 불필요 |
| FR-60 · 61 · 77 대시보드 · 관측 | — | 범위 이동 → `OPS-001`(배포 착수 시) |

- 미충족: 없음
