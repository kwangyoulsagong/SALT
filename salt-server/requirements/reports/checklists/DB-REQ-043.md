## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-6 출처 라벨 | 충족 | 마이그레이션 적용(`prisma migrate deploy`) · CHECK 6값 · 국내 장기 51,305 → `backtest_full` · 롤백 SQL 머리 · `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |
| FR-1~5 · FR-6 등급 표 · 뷰 | 미착수 | 단계 2~4 |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-3 표 · 뷰 · CHECK | 충족 | `20261111120000_forecast_base_rate` — `below_min` 이면 숫자 NULL CHECK · `closed` 면 문턱 NULL CHECK · 문턱 뷰는 시장마다 최신 실행 |
| FR-7 원장 · export 뷰 · 채점 표 | 충족 | `20261111130000_trade_check_ledger` · `20261111140000_trade_check_export_and_outcome` · prisma migrate diff 0 |
| 롤백 | 충족 | 전부 추가만 — 파일 머리에 DROP 순서 |
| 직접 읽기 목록 고정(`DB-REQ-036` FR-3) | 충족 | 예측은 원장을 export 뷰로만 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-1 해설 스냅샷 | 충족 | 마이그레이션 `20261111150000`(추가만 · 롤백 DROP) · 로컬 DB 적용 · UPDATE → `불변이다` 오류(트리거) · `EXPLAIN` 인덱스 스캔 0.005ms · 유일 키 ON CONFLICT |
