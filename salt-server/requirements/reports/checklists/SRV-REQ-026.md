# SRV-REQ-026 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: 5개 경로가 `coach` 컨텍스트에 있다 · 게이지 워커(`investment-insight.worker.ts`) · 판단 스냅샷(`RecordSymbolJud / 실패사례 출처 `IndicatorTrackAdapter` · FR-30~36 의 N+1 · `payload` fallback 은 지난 일(스냅샷 원장)


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| FR-72 — 성적 조회 실패 → `track_record_unavailable` | 충족 | `npm test` 1129/1129 · lint · build · `test:layer-check` · 레이어 훅 사후(음성 대조 exit 2) |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 160(코인 장기 100 · 국내 단타 50 · 코인 단타 10) | 채울 과거 검산 · 국내 단타 원장 채점이 아직 없다 — 숨기지 않고 결함 꼬리표 | 1b(`FC-REQ-028` FR-5 · `SRV-REQ-040` FR-63) |
