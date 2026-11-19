# DB-REQ-013 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 1(`feat/f003-v2-s1-band-forecast`)

- `20261119200000_forecast_accumulation_band` 로컬 `migrate deploy` · CHECK 넷(자산 · 지표 · 밴드 · 사유) + 관문 실패면 배수 1.0 · 뷰 조회 Index Scan(버퍼 6)
- 미충족: 사람 표 둘(설정 · 실행 기록) — 순서 2

## 2026-11-19 F003 v2 순서 2

- `20261119300000` · `20261119300100` 로컬 `migrate deploy` · `prisma migrate diff`(그림자 DB) 내 표 차이 0 · 등급 주석(financial) 둘
- `EXPLAIN (ANALYZE, BUFFERS)` 사람 행 목록 Index Scan 0.05ms · 주별 뷰 0.12ms(표 2행 — 순차 읽기)
- 미충족: 없음
