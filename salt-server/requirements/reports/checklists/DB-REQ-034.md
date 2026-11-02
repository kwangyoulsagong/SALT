# DB-REQ-034 — forecast 주요 사건 스키마(1단계) 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| 마이그레이션 | `20261102140000_forecast_kr_market_events` — `prisma migrate deploy` 로컬 적용 |
| 적용 전 스냅샷 | `scheduled_event` · `event_reaction` `pg_dump -Fc`(17KB, 세션 스크래치) |
| 행 보존 | 일정 198 · 반응 185 그대로 / 원장 3종(거래 2 · 보유 2 · 시세 3,970,678) 그대로 |
| 계약 | 예측 `test_schema_contract.py` 실 DB 통과 · 서버 `PrismaForecastReader.eventCards` · `PrismaMarketScheduleReader` 실서버 200 |
| 실행계획 | `v_upcoming_event` 0.10ms(Seq Scan — 행 수백, FR-6 그대로) · `v_event_card` 한 종목 0.19ms(`event_reaction_stats_latest` Bitmap Index) |
| 롤백 | SQL 머리 주석에 순서. 1단계엔 `symbol <> ''` 행 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 · FR-5(실적 종류 · 예상 창 표) | 2단계 | `FC-REQ-021` 2단계 |
| 롤백 SQL 실행 | 로컬 DB 가 상시 서버 · 예측의 DB 라 되돌리면 방금 쌓은 국내 일정이 지워진다 — 스냅샷으로 대신 | 운영 배포 전 리허설(`OPS-001`) |
