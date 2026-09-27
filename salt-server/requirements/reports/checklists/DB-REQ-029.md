# DB-REQ-029 F008 forecast 스키마 — 체크리스트 (2026-09-23)

| 마이그레이션 | 내용 | 로컬 적용 |
|---|---|---|
| `20260923120000_forecast_schema` | 스키마 · 7테이블 · `v_forecast_card` | ✅ |
| `20260923130000_forecast_direction_base` | `gate.direction_base_rate` (방향 적중의 기저율) | ✅ |
| `20260923140000_forecast_series_range_gate` | `series_point` · `range_renderable` · `range_blocked_reason` | ✅ |
| `20260923150000_forecast_skill_ci` | `pinball_skill_ci_low` | ✅ |

- SQL 전용(Prisma 모델 없음) — `prisma migrate status` up to date, 기존 모델 diff 0
- 롤백: `DROP SCHEMA forecast CASCADE` 한 줄 — `public` 과 FK 없음
- `v_forecast_card` 한 종목 **1.4ms**(Seq/Index 혼합, 1,156 gate 행)
- Python 선언 ↔ DB 컬럼 대조 테스트 통과(`tests/store/test_schema_contract.py`)

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| DB 역할 분리 | 배포 설정 | 배포 환경 확정 시 |
| 서버의 뷰 조회 | 서버 코드가 아직 없다 | 슬라이스 17a (`SRV-REQ-037`) |

## 2026-09-27 — FR-16 · 17 쏠림 신호 (`20260927130000_forecast_market_signal`, FC-REQ-007)

| 확인 | 결과 |
|---|---|
| 적용 | `prisma migrate deploy` — 추가만(표 2 · 뷰 2 · 인덱스 1). 롤백 = DROP VIEW 둘 · DROP TABLE 둘 |
| 제약 | `funding_pct_1y` 0~1 · 상태 코드 CHECK · 백분위 ↔ 상태 · 김프 ↔ 환율 같이 null. 쓰기 224행 위반 0 |
| `v_market_signal` BTC | `EXPLAIN (ANALYZE, BUFFERS)` Index Scan `market_signal_latest` · shared hit 3 · 0.028ms |
| `v_signal_reaction` BTC | Index Scan `event_reaction_stats_latest` · shared hit 44 · 0.034ms. kind 는 필터(Rows Removed 36 — 주요 사건 행). as_of 가 하루 12행씩 쌓여 선형으로 는다 — 1년 뒤 BTC 약 4,400행 스캔, 수 ms 예상 |
| Python 계약 | `tests/store/test_schema_contract.py` 통과(새 두 표 선언 ↔ DB) |

미검증: 1년 누적 뒤 `v_signal_reaction` 실측 — 보존 정책(`db-contract.md` §5)과 같이 본다(2027-09).
