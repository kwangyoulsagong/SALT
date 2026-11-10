# SRV-REQ-026 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: 5개 경로가 `coach` 컨텍스트에 있다 · 게이지 워커(`investment-insight.worker.ts`) · 판단 스냅샷(`RecordSymbolJud / 실패사례 출처 `IndicatorTrackAdapter` · FR-30~36 의 N+1 · `payload` fallback 은 지난 일(스냅샷 원장)


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| FR-72 — 성적 조회 실패 → `track_record_unavailable` | 충족 | `npm test` 1129/1129 · lint · build · `test:layer-check` · 레이어 훅 사후(음성 대조 exit 2) |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 ~~160~~ → **6**(1b 2026-11-10 — 코인 · 국내 단타 과거 검산 `signal-skill@1` `f38ca6ae` · 국내 단타 원장 `326a0553`, 서버 150요청 · 300모드 실측). 남은 6 = 코인 장기 피하기 — 과거 검산 판단 날 8 < 등록 10(본 기간 뒤 9-29 ~ 만기가 온 판단만) | 규칙을 고른 기간(2018 ~ 2026-09)은 등록상 화면에 못 쓴다 — 날이 쌓이길 기다림(숨기지 않고 결함 꼬리표) | 판단 날 ≥ 10 이 차면 `npm run judgments:signal-skill -- --write` 재실행 — 코인 장기 격자상 11월 중 |

## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 과거 검산 채움 자산군 무관 | 충족 | `krJudgmentBacktestTrack.test.ts`(코인 판단 날 10/9 경계 · 국내 단타) · `judgmentBacktest.test.ts` 경계 표 · `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |

## 1b 확인 2회차 — 2026-11-10

| 항목 | 상태 | 근거 |
|---|---|---|
| 성적표 출처 = 카드 출처 | 충족 | 불변식 테스트 2 · 실 성적표 7그룹(`scalp.avoid` 1,496 · `long_term.wait` 94 = 카드) · `npm test` 1148/1148 |
