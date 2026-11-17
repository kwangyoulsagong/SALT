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

> **2026-11-02 1단계 구현** — FR-1 · 2 · 3 + FR-7(새) `20261102140000_forecast_kr_market_events`. 로컬 DB 적용(전 두 표 `pg_dump` · 원장 3종 행 수 동일).
> 2단계(FR-4 · 5)는 `FC-REQ-021` 2단계와 같이. 검증 `checklists/DB-REQ-034.md`.
> **2026-11-17 2단계** — FR-4 · FR-5(열 확대) · **FR-8 신규** `20261117120100_forecast_kr_earnings` · 원천 표는 서버 `20261117120000_dart_earnings_filing`(`SRV-REQ-041` FR-8~10). 추가만.

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
| FR-5 | `forecast.kr_earnings_window(symbol, as_of, quarter_lag_min, quarter_lag_median, quarter_lag_max, sample, PRIMARY KEY (symbol, as_of))` · 읽기 뷰 `v_kr_earnings_window`(종목별 최신 1행). **2026-11-17 구현 · 열 확대**: `period_end` · `annual` · `window_from` · `window_to` · `deadline`(법정 기한 — 기준) · `hits` · `judged`(워크포워드 채점) · `misses jsonb` · `confirmed_at` · `confirmed_time_known` · `confirmed_source` · `renderable` · `blocked_reason` · `computed_at` — 3종(표본 · 적중 · 빗나간 사례)과 확정 일정을 한 행에 | 2 |
| FR-8 | **(2026-11-17 신규)** `forecast.v_kr_earnings_reaction` — `event_reaction_stats` 의 `kr_earnings` 기간별 최신 1행. 실적은 날짜를 미리 몰라 `v_event_card`(앞 35일 일정과 조인)에 못 탄다 — 창과 같이 읽는다 | 2 |
| FR-6 | 인덱스 — `scheduled_event (event_at)` 부분 인덱스 없음(행 수 수천). `event_reaction_stats` 기존 PK 그대로 | — |
| FR-7 | **(2026-11-02 추가)** `forecast.v_upcoming_event(kind, event_at, event_symbol, source)` — 앞으로 35일(지난 하루 포함) 일정만, 통계와 조인하지 않는다. 다가오는 일정 줄(`SRV-REQ-041` FR-5)은 분포가 없어 `v_event_card`(통계가 있어야 행이 나온다)로는 막 쌓인 일정을 못 본다. **2026-11-02: 웹 소비처는 국내 요약 응답 `schedule`(`SRV-REQ-042` FR-5) — 같은 뷰** | 1 |

## 롤백

FR-2 는 PK 교체라 되돌리려면 `symbol <> ''` 행을 먼저 지워야 한다. 1단계에는 그런 행이 없으므로 1단계 마이그레이션은
되돌릴 수 있다. 2단계 뒤 롤백은 종목 사건 손실을 뜻한다(재수집 가능 — 원천이 공시 목록).
2단계(2026-11-17)는 추가만 — 뷰 둘 · 표 하나 DROP, `kind IN ('kr_earnings','kr_ir')` 행 지운 뒤 CHECK 를 7종으로. 서버 원천 표 둘은 DROP(DART 에서 다시 받는다).

## 영향

- `salt-server` `ForecastReader.eventCards` 매핑에 `eventSymbol` 1열(`SRV-REQ-041`)
- 예측 `store/events.py` upsert 키 변경(`FC-REQ-021`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 1단계 구현 · in-progress — FR-1~3 · FR-7 추가. `EXPLAIN ANALYZE` 0.10ms(`v_upcoming_event`) · 0.19ms(`v_event_card` 한 종목, `event_reaction_stats_latest` 인덱스) |
| 2026-11-02 | 국내 탭 요약 띠(`feat/kr-market-summary`): **DDL 없음** — FR-7 `v_upcoming_event` 의 웹 소비처가 국내 요약 응답 `schedule`(`SRV-REQ-042` FR-5)로 바뀌었다(같은 읽기) |
| 2026-11-17 | F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`) — **FR-4 · 5 · 8 구현** — `kind` 둘 · `kr_earnings_window`(3종 · 확정 일정 열 확대) · `v_kr_earnings_reaction`(신규). 추가만 |
