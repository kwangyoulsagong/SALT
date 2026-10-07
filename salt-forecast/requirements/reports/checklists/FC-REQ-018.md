# FC-REQ-018 체크리스트 — 운영 점검 ops_monitor (2026-10-07)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/ops_health.py` `check_job` · `check_jobs` · `error_kind` | `tests/domain/test_ops_health.py` — `ok` · `overdue` · `never` · 마지막 성공 뒤 실패가 지연보다 먼저 · 오류 타입만 · 기대표가 일일 단계를 한 번씩 |
| FR-2 | 같은 파일 `check_weekly_ledger` · `last_monday` | 테스트(5경우): 마감 전 `due`(건강으로 센다) · 마감 뒤 `missing` · t+26.5h `late`(10-05 실제 사건) · t+3h `ok` · 라이브 시작 전 `ok` · 월요일 = UTC 자정. `--as-of 2026-10-05T12:00` dry-run 이 `due` 로 재현 |
| FR-3 | 같은 파일 `check_daily_ledger` | 테스트: 2026-10-07 실제 상태로 "최근 7일 중 5일 없음(10-01~10-05)" · 오늘 몫 미발행은 빈 날 아님 · 첫 발행 전은 세지 않음 · 행 0 이면 `never` |
| FR-4 | `store/ops.py` · `store/tables.py` · `scoring/ops_monitor.py` · `jobs/ops_monitor.py` · 마이그레이션 `20261007100000_forecast_ops_check` | 로컬 `migrate deploy` · 스키마 계약 통과. 같은 시간 두 번 실행 → 13행 유지(멱등) |
| FR-5 | `jobs/ops_monitor.py` 정리 | `--dry-run` 이 지울 개수만 출력(쓰기 0) |
| FR-6 | `ops/daily.sh` | 매시 `due --hours 0.75` · 일일 단계 끝 `steps+=(ops_monitor)` |
| FR-7 | `ops/daily.sh` `due --job rule_ic --hours 156` | 첫 실행의 `rule_ic` overdue 217.8h 가 다음 일일 단계에서 돌 조건 |

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check`(230 파일) · `pyright` 0 · `lint-imports` 3 kept
- `pytest` 231 통과(새 `test_ops_health.py` 12) · `tests/leakage` 통과 · 스키마 계약(`FORECAST_DATABASE_URL`, `ops_check` 포함)
- `ops_monitor --dry-run` · `--as-of 2026-10-05T12:00` 재현 · 실제 실행 2회(13행)

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 알림 · 서버 표시 | 운영 알림 경로 · 뷰 없음 — 로그 · 표만 | 필요 시 뷰 + `SRV-REQ` |
| `judgment_ledger` 10-01~10-05 빈 날 | 복구 불가 | 2026-11-23 라이브 IC 리포트에 표본 부족을 적는다 |
| `daily` 외 단계 실패의 같은 날 재시도 | 20시간 게이트가 `daily` 성공만 본다 | `daily.sh` 게이트를 단계별로 나누는 별도 작업 |
| ops 조회 `EXPLAIN (ANALYZE, BUFFERS)` | 표가 작다(13행/시) | 행이 수백을 넘으면 |
| 운영 DB 마이그레이션 | 로컬만 | 배포 시 |
