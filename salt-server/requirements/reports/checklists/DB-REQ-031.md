# DB-REQ-031 F009 코치 스키마 — 체크리스트 (슬라이스 1, 2026-09-24)

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260924150000_coach_trade_plan_risk_budget` 로컬 적용 · `migrate status` up to date · `prisma validate` · `prisma generate` |
| 추가만 | 기존 컬럼 · 행 변경 0 — `prisma migrate diff`(이전 스키마 → 새 스키마) 출력이 `ADD COLUMN` · `CREATE TABLE` · `CREATE INDEX` · `ADD CONSTRAINT` 뿐 |
| 정밀도 | 금액 `(38,10)` · 수량 `(38,18)` · 비율 `(18,8)` — 처음에 좁게 잡았다가 규칙에 맞춰 로컬 롤백 후 다시 만들었다 |
| CHECK 실측 | `probability_up = 1.5` → `trade_plans_values_check` 거부 · 예산 값만 있고 단위 `NULL` → `user_investment_profiles_budget_unit_check` 거부 |
| FK 실측 | 계획 → 실제 거래 연결 성공(로컬 사용자 1명) |
| 정리 | 통합 확인이 만든 계획 · 예산 값 되돌림 — `trade_plans` 0행 · 예산 있는 프로필 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `EXPLAIN (ANALYZE)` 인덱스 사용 | 새 테이블이 비어 있어 계획기가 순차 스캔을 고른다 — 의미 있는 계획이 안 나온다 | 계획 행이 쌓인 뒤(슬라이스 4 배치 도입 시) |
| 운영 DB 적용 · 락 시간 | 운영 DB 미접근. `ADD COLUMN` nullable · 기본값 상수라 테이블 재작성 없음(PG 11+) | 운영 배포 |
| `decision_outcomes` 쓰기 경로 | 슬라이스 4 | `SRV-REQ-038` FR-9 |

## 슬라이스 2 — FR-8 `forecast.realized_vol` (2026-09-24)

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260924170000_forecast_realized_vol` 로컬 적용(`migrate deploy`) · 추가만(테이블 1 · 인덱스 1 · 뷰 1) |
| Python 선언 대조 | `salt-forecast/tests/store/test_schema_contract.py` 실 DB 로 통과 |
| 쓰기 | Python 작업 2회 → 289행 그대로(멱등) · CHECK 위반 0 |
| 서버 읽기 경로 | `EXPLAIN (ANALYZE, BUFFERS)` 0.027ms — `realized_vol_latest` 인덱스 · shared hit 4 |

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| DB 역할 권한(`salt_forecast` 쓰기 · 서버 SELECT) | 로컬은 한 역할 — 기존 `forecast` 테이블과 같은 상태 | 운영 역할 분리 시(`DB-REQ-029`) |
| 운영 DB 적용 | 미접근 | 운영 배포 |
