# DB-REQ-020 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: "지금 문제"의 200쿼리 N+1(`signal-performance.service.ts`) · `payload` fallback 체인은 **삭제됨**(`SRV-

## 2026-11-19 FR 대조 정리 (`WEB-perf-req-close-slice.md`, `feat/web-perf-close`)

- 상태: **to-do → done**. FR ↔ 근거 전체 표는 스펙 `## 정리 2026-11-19` 절(1:1)
- FR-1 충족 — **결함 고침**: 피드백도 `ai_coach` 타입에 쌓여 피드백 한 건 뒤 최신 추천 조회가 피드백 행을 골랐다(상세 · 리포트 · 대화 추천 카드 `null`).
  `FEEDBACK_KEY_PREFIX`(`coach/domain/ports.ts:105`) · `EXCLUDE_FEEDBACK`(`PrismaCoachInsightStore.ts:65-66`)를 세 조회(:86 · :97 · :186)에 · 접두사 없는 키 거절(:154-156) ·
  `RecordCoachFeedback.ts:44` 접두사 사용. 시험 `feedbackRowsExcluded.test.ts` 둘 · `recordCoachFeedbackKey.test.ts` · 변이(최신 조회에서 빼면 실패, scratchpad 사본) · 실 DB(임시 사용자, 지움)
- FR-41 · 42 충족 — 보존 90일 · 생성마다 한 문장 지우기(`GenerateCoachRecommendation.ts:75` · `:124-127` · `PrismaCoachGenerationLogStore.ts:72-79`). 나눠 지우지 않는 근거: 표 0행 · 48kB · 생성 때만 늘어남
- FR-31 · 40 측정 충족 — coach detail 쿼리 11 · p95 5.0ms / `generation-status` p95 1.0ms
- 범위 이동: FR-70 → `SRV-REQ-027` FR-70 · FR-72 → `SRV-REQ-027` FR-73 · 지연 수용 기준 셋 → `SRV-REQ-027` FR-6 · 예산 표 · FR-70(같은 요구 두 벌)
- 나머지 대체(원장 · 컬럼 승격 없음 · append-only 스냅샷) — 스펙 표
- 미충족: 없음(이 REQ 몫). 옮긴 측정은 `SRV-REQ-027` 2회차 실측으로 같은 날 닫힘(그쪽 체크리스트 2회차 절)
