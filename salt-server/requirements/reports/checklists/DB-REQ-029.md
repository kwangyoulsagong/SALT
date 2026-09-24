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
