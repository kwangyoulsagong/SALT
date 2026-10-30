---
id: DB-REQ-034
feature: F008
area: db
kind: DATA
title: "F008 슬라이스 24 — forecast 주요 사건 스키마: 국내 일정 종류 · 종목 사건 · 실적 예상 창"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

`forecast.scheduled_event` 는 `kind IN ('fomc','cpi','jobs')` CHECK 와 PK `(kind, event_at)` 로 만들어졌다(`DB-REQ-029` FR-14).
국내 시장 일정은 종류만 늘리면 되지만, **종목 실적 공시는 같은 시각에 여러 종목이 낸다** — PK 에 종목이 없으면 두 번째 행이
첫 행을 덮는다. 쓰기는 `salt-forecast` 만, 서버는 뷰만 읽는다(`db-contract.md`). SQL 전용 마이그레이션.

## FR

| FR | 내용 | 단계 |
|---|---|---|
| FR-1 | `scheduled_event.kind` CHECK 에 `kr_bok_rate` · `kr_cpi` · `kr_trade` · `kr_quad_expiry` 추가 | 1 |
| FR-2 | `scheduled_event.symbol text NOT NULL DEFAULT ''` 추가 · PK 를 `(kind, event_at, symbol)` 로. 기존 행은 `''`(시장 일정). `event_reaction` FK 를 `(kind, event_at, event_symbol)` 로 바꾸고 `event_reaction.event_symbol` 열 추가(시장 일정 `''`, 종목 사건 = `symbol` 과 같음) | 1 |
| FR-3 | `v_event_card` — `e.symbol = ''` 이거나 `e.symbol = s.symbol` 인 행만. 지금 출력 열에 `e.symbol AS event_symbol` 하나 추가(서버가 시장 · 종목 사건을 가른다) | 1 |
| FR-4 | `kind` CHECK 에 `kr_earnings` · `kr_ir` 추가 | 2 |
| FR-5 | `forecast.kr_earnings_window(symbol, as_of, quarter_lag_min, quarter_lag_median, quarter_lag_max, sample, PRIMARY KEY (symbol, as_of))` · 읽기 뷰 `v_kr_earnings_window`(종목별 최신 1행) | 2 |
| FR-6 | 인덱스 — `scheduled_event (event_at)` 부분 인덱스 없음(행 수 수천). `event_reaction_stats` 기존 PK 그대로 | — |

## 롤백

FR-2 는 PK 교체라 되돌리려면 `symbol <> ''` 행을 먼저 지워야 한다. 1단계에는 그런 행이 없으므로 1단계 마이그레이션은
되돌릴 수 있다. 2단계 뒤 롤백은 종목 사건 손실을 뜻한다(재수집 가능 — 원천이 공시 목록).

## 영향

- `salt-server` `ForecastReader.eventCards` 매핑에 `eventSymbol` 1열(`SRV-REQ-041`)
- 예측 `store/events.py` upsert 키 변경(`FC-REQ-021`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
