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

## F010 슬라이스 1 (2026-09-29) — FR-19

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20260929100000` 로컬 적용. push 전 `rule_ic.mode` CHECK 에 `any` 를 더하도록 원 파일 수정 → 로컬 제약 · `_prisma_migrations.checksum` 수동 정렬 · `migrate status` up to date |
| 사전등록 | 1행 · 원문 sha256 = 커밋 `836018b` 파일 · UPDATE → `forecast.preregistration 는 불변이다`. 처음엔 트리거 함수가 `OLD.id` 를 찾아 엉뚱한 오류로 막혔다(이 표는 `key`) — 표 이름으로 알리게 고침 |
| `rule_ic` | 297행 · 재실행 멱등 · FK(prereg_key) |
| Python 계약 | `tests/store/test_schema_contract.py` 통과(새 두 표 선언 ↔ DB) |

## F010 슬라이스 2 — FR-20 (2026-09-29, `20260929110000_forecast_market_regime`)

| 확인 | 결과 |
|---|---|
| 적용 | 로컬 `prisma migrate deploy` · `migrate status` up to date. 주석 번호 정정 뒤 로컬 체크섬을 손으로 맞춤(다른 DB 미적용) |
| 계약 | `salt-forecast` `tests/store/test_schema_contract.py` 실 DB 통과(`market_regime` 20열 · `realized_vol.btc_beta`) |
| 제약 | `gate_key IS NOT NULL OR gate_open` · p_high 0~1 · 낙폭 ≤ 0 · 계수 (0, 1] · 종가 > 0 |
| 뷰 | `v_market_regime` BTC 1행 · `v_realized_vol` 끝에 `btc_beta` — 서버 쿼리 EXPLAIN 0.11ms · 1.43ms |
| 롤백 | DROP VIEW · DROP TABLE · `v_realized_vol` 앞 정의 복원 · DROP COLUMN(마이그레이션 머리 주석) |

| 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 운영 DB 적용 | 로컬만 | 배포 시 `prisma migrate deploy` |

## FR-21 — 목표 비중 라이브 원장 (2026-09-29)

- `20260929130000_forecast_target_weight_live` 로컬 `prisma migrate deploy` 적용 · `tests/store/test_schema_contract.py` 통과(선언 3표 = DB 열)
- 불변: 두 원장 표 UPDATE 트리거(`judgment_ledger_immutable` 재사용) · 결과 CHECK(missing_bar 가 아니면 수익 NOT NULL)
- 뷰 `v_target_weight_live` EXPLAIN: PK Index Scan · 0.015ms(행 0)
- 롤백: 뷰 → 요약 → 결과 → 비중 DROP(참조 역순). 미검증: 운영 DB 적용(배포 시)

## FR-22 — `forecast.market_warning_snapshot` · `v_market_warning` (2026-09-30)

- 마이그레이션 `20260930100000_forecast_market_warning` 추가만 · `prisma migrate deploy` 로컬 적용 · `salt-forecast` 스키마 계약 테스트 통과
- 불변: UPDATE 트리거(`judgment_ledger_immutable`) · 쓰기는 `INSERT … ON CONFLICT DO NOTHING`
- 실측: 스냅샷 290행 × 2 · 뷰 한 종목 Bitmap Index Scan 0.248ms · 서버 배치 3종목 0.375ms(Seq Scan 580행 — 표가 커지면 `(symbol, fetched_at DESC)` 인덱스)
- 롤백: `DROP VIEW forecast.v_market_warning; DROP TABLE forecast.market_warning_snapshot;`
- 미검증: 운영 DB 적용(배포 시)
