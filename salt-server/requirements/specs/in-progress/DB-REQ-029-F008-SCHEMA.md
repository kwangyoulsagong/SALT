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
| FR-13 | `forecast.v_daily_close` — `price_bar` 업비트 1d 만(symbol · open_time · available_at · close). 차트 과거 선 (2026-09-24, SQL 전용 마이그레이션 `20260924100000`) |

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| DB 역할 분리(`salt_forecast` 쓰기 권한) | 클러스터 수준 객체 — 마이그레이션이 아니라 배포 설정 | 배포 환경 확정 시 |
| 온톨로지 테이블 | 슬라이스 20 | `DB-REQ-030` |
