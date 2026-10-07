# FC-REQ-019 체크리스트 — 판정 창 · 빗나간 수 (2026-10-07)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/scoring.py` | `tests/domain/test_scoring.py` — 26개 중 2개 범위 밖 → `miss_count == 2` |
| FR-2 | `scoring/evaluate.py` | `regate` 실행 1168행 — BTC 1주 창 `2025-09-22 ~ 2026-09-14`(52) |
| FR-3 | `domain/events.py` | `tests/domain/test_events.py` — 창 = 첫 · 마지막 사건 · `miss_count ≥ len(recent_misses)` · `miss_judged == 사건 수 − MIN_SAMPLE` |
| FR-4 | `store/*` · 마이그레이션 | 스키마 계약 테스트(`FORECAST_DATABASE_URL`) 통과 · `events` 390행 · `signals` 9531행 |

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check` · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과 · 스키마 계약 실제 DB 로 실행(건너뜀 아님)

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `daily` 배치 경로에서 게이트 열 채움 | `regate` 로 같은 함수(`gates`)를 돌렸고 `daily` 는 돌리지 않았다 | 다음 LaunchAgent `daily.sh` 실행 뒤 `forecast.gate.window_from` 확인 |
| 지난 `as_of` 반응 통계 행 | NULL 로 남는다 — 뷰는 최신 행만 | 범위 밖(계약은 최신 행) |
| 운영 DB | 로컬만 | 배포 시 |
