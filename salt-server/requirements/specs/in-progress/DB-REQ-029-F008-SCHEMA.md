---
id: DB-REQ-029
feature: F008
area: db
kind: SCHEMA
title: "F008 전망 — forecast 스키마 (가격 · 예측 · 채점 · 게이트 · 카드 뷰)"
priority: high
labels: [db, forecast, schema, sql-migration]
created: 2026-09-23
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

`salt-forecast`(Python)가 쓰고 `salt-server` 가 읽는 `forecast` 스키마를 만든다. 슬라이스 16 은 전망 · 채점에 필요한
테이블만 — 온톨로지(`entity` · `relation` · `fact`)는 슬라이스 20.

## 결정 — Prisma 모델 없이 SQL 마이그레이션으로

- `multiSchema` 를 켜면 기존 모델 전부에 `@@schema("public")` 가 붙는다(판단 하나에 40여 모델 diff).
- 대신 `prisma migrate dev --create-only` 로 만든 **SQL 전용 마이그레이션**에 `CREATE SCHEMA forecast` 와 테이블을 넣는다.
  Prisma 는 `schemas` 목록 밖이라 이 스키마를 드리프트로 보지 않는다. **마이그레이션 이력은 여전히 한 벌**이다.
- 서버는 `$queryRaw` 로 **뷰만** 읽는다(`v_forecast_card`).

## FR

| FR | 내용 |
|---|---|
| FR-1 | `forecast.price_bar(source, symbol, interval, open_time, close_time, available_at, o/h/l/c numeric, volume, ingested_at)` PK `(source, symbol, interval, open_time)` |
| FR-2 | `forecast.job_run` · `forecast.source_status` |
| FR-3 | `forecast.model(model_version PK, name, params jsonb, created_at)` |
| FR-4 | `forecast.prediction(symbol, horizon_weeks, as_of, model_version, kind, base_close, q05…q95, p_up)` PK `(symbol, horizon_weeks, as_of, model_version)`, `kind ∈ {backtest, live}` |
| FR-5 | `forecast.score` — 같은 키 + 실현 r · 커버리지 90/80 적중 · 구간 폭 · pinball 합 · 방향 판정(`up`/`down`/`abstain`) · 적중 |
| FR-6 | `forecast.gate(symbol, horizon_weeks)` — `renderable` · `blocked_reason` · 26주 지표(커버리지 · 폭 · 기준 폭 · pinball skill · 판정 수 · 적중 수 · 항상 오른다 비율 · 표본 · `score_kind`) |
| FR-7 | `forecast.v_forecast_card` — gate + 최신 live 예측 + 최근 빗나간 3건 |
| FR-8 | 인덱스: `prediction(symbol, horizon_weeks, as_of desc)` · `score(model_version, horizon_weeks, as_of)` |
| FR-14 | `forecast.scheduled_event` · `event_reaction` · `event_reaction_stats` — 거시 일정 · 사건별 반응 · 워크포워드 통계 (2026-09-24, `20260924120000`, FC-REQ-005) |
| FR-15 | `forecast.v_event_card` — 앞으로 35일 일정 × 종목 · 기간별 최신 통계. 서버가 읽는 계약 · 실측 0.58ms |
| FR-16 | `forecast.market_signal(symbol, as_of)` · `forecast.signal_event(kind, symbol, event_at)` — 쏠림 신호 지금 상태 · 사건 × 반응. 반응 통계는 기존 `event_reaction_stats` 에 kind 4개로(그 표엔 kind CHECK 가 없다) (2026-09-27, `20260927130000`, FC-REQ-007) |
| FR-17 | `forecast.v_market_signal`(종목별 최신 한 행) · `forecast.v_signal_reaction`(종목 × 종류 × 기간 최신 통계) — 서버가 읽는 계약 · 실측 0.028 · 0.034ms |
| FR-18 | `forecast.v_forecast_card` 의 `recent_misses` 가 **게이트가 판정한 kind 만** 본다 — `score.kind = gate.score_kind` 로 거르고 `prediction` 과 kind 까지 포함해 붙인다. 백테스트 · 라이브 빗나감이 섞이거나 같은 as_of 가 두 번 붙던 것을 막는다. 컬럼 목록 · 순서 무변화 (2026-09-28, `20260928100000_forecast_card_misses_kind`, F010 슬라이스 0) |
| FR-19 | `forecast.preregistration`(key PK · 등록일 · 기록 시각 · git sha · 원문 sha256 · 내용 jsonb, UPDATE 트리거 금지) · `forecast.rule_ic`(사전등록 키 FK · 실행 as_of · source backtest/live · 항목 · 모드 scalp/long_term/market/any · 지평 · 라벨 fixed/barrier · 국면 · IC 종류 · 창 · 날짜 수 · 평균 종목 · IC · CI · t · 판정 · 1차 여부, 실행마다 쌓음). 쓰기 `salt-forecast` 만. **서버는 아직 읽지 않는다**(뷰 없음) — `FC-REQ-008` (2026-09-29, `20260929100000_judgment_ledger_rule_ic`, F010 슬라이스 1) |
| FR-20 | `forecast.market_regime`((symbol, as_of) PK · 종가 · 200일선 · trend_open · HMM p_high(0~1) · 적합 월 · 상태별 연 σ · 365일 낙폭(≤ 0) · EWMA 연 σ · 채택 게이트 · gate_open(게이트 없으면 참 — CHECK) · 이벤트 계수(0~1] · 다음 이벤트 · 사전등록 키) · 뷰 `forecast.v_market_regime`(종목별 최신) · `realized_vol.btc_beta` + `v_realized_vol` 끝에 열 추가. 쓰기 `salt-forecast` 만, 서버는 뷰만 — `FC-REQ-010` (2026-09-29, `20260929110000_forecast_market_regime`, F010 슬라이스 2, 추가만) |
| FR-13 | `forecast.v_daily_close` — `price_bar` 업비트 1d 만(symbol · open_time · available_at · close). 차트 과거 선 (2026-09-24, SQL 전용 마이그레이션 `20260924100000`) |

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| DB 역할 분리(`salt_forecast` 쓰기 권한) | 클러스터 수준 객체 — 마이그레이션이 아니라 배포 설정 | 배포 환경 확정 시 |
| 온톨로지 테이블 | 슬라이스 20 | `DB-REQ-030` |

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-09-28 | FR-18 추가 — `20260928100000_forecast_card_misses_kind`. 롤백 = `20260923150000_forecast_skill_ci` 의 뷰 정의로 `CREATE OR REPLACE`. 로컬 DB 에 아직 적용하지 않았다 |
| 2026-09-29 | FR-19 추가 — `20260929100000_judgment_ledger_rule_ic`(추가만). 로컬 적용 · 사전등록 1행(해시 커밋 파일과 일치) · `rule_ic` 297행(항목 × 모드 × 지평 × 라벨 × 국면 3). push 전 `mode` CHECK 에 `any` 를 더하도록 원 파일을 고쳤다 |
