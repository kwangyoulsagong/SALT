-- DB-REQ-029 FR-16 · FR-17 (2026-09-27, F008 슬라이스 23 · FC-REQ-007) — 시장 신호: 펀딩비 쏠림 · 김치 프리미엄 0 교차.
-- 쓰기는 salt-forecast 만, 서버는 v_market_signal · v_signal_reaction 뷰만 읽는다(db-contract.md §1 · §2).
-- 추가만 — 롤백은 DROP VIEW 둘 · DROP TABLE 둘. 반응 통계는 기존 event_reaction_stats 에 kind 로 구분해 쌓는다
-- (그 표에는 kind CHECK 가 없고, v_event_card 는 scheduled_event 와 조인하므로 새 kind 가 섞이지 않는다).

-- 종목 × 날(UTC 자정 as_of)의 지금 상태. 값이 없으면 null(0 으로 채우지 않는다)
CREATE TABLE forecast.market_signal (
  symbol          text             NOT NULL,
  as_of           timestamptz      NOT NULL,
  bar_open        timestamptz      NOT NULL,
  funding_rate    double precision,                 -- 봉 마감 전 24시간 정산 평균(8시간 단위 비율)
  funding_pct_1y  double precision CHECK (funding_pct_1y BETWEEN 0 AND 1),  -- 앞 365일 일평균 중 이보다 낮은 비율
  funding_sample  integer          NOT NULL,
  funding_state   text             CHECK (funding_state IN ('long_crowded', 'short_crowded', 'neutral')),
  oi_usd          double precision,
  oi_at           timestamptz,
  oi_change_7d    double precision,
  kimchi_premium  double precision,                 -- 업비트 ÷ (바이낸스 USDT × ECB 원/달러) − 1
  kimchi_state    text             CHECK (kimchi_state IN ('premium', 'discount')),  -- 3일 연속으로 확정된 부호
  kimchi_since    timestamptz,                      -- 지금 부호가 확정된 시각(기록 시작부터 그대로면 null)
  fx_usdkrw       double precision,
  fx_observed_at  timestamptz,
  computed_at     timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, as_of),
  CHECK ((funding_pct_1y IS NULL) = (funding_state IS NULL)),
  CHECK ((kimchi_premium IS NULL) = (fx_usdkrw IS NULL))
);
CREATE INDEX market_signal_latest ON forecast.market_signal (symbol, as_of DESC);

-- 사건 하나 × 반응. 창이 아직 안 닫힌 기간은 null
CREATE TABLE forecast.signal_event (
  kind           text             NOT NULL CHECK (kind IN ('funding_long_crowded', 'funding_short_crowded', 'kimchi_cross_up', 'kimchi_cross_down')),
  symbol         text             NOT NULL,
  event_at       timestamptz      NOT NULL,
  value          double precision NOT NULL,         -- 사건 때 펀딩 백분위 또는 김치 프리미엄
  ref_bar_open   timestamptz      NOT NULL,
  pre_return_5d  double precision,
  ret_1d         double precision,
  ret_5d         double precision,
  ret_20d        double precision,
  computed_at    timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, symbol, event_at)
);

-- 서버가 읽는 계약 ①: 종목별 최신 상태 한 행
CREATE VIEW forecast.v_market_signal AS
SELECT DISTINCT ON (symbol)
  symbol, as_of, bar_open, funding_rate, funding_pct_1y, funding_sample, funding_state,
  oi_usd, oi_at, oi_change_7d, kimchi_premium, kimchi_state, kimchi_since, fx_usdkrw, fx_observed_at
FROM forecast.market_signal
ORDER BY symbol, as_of DESC;

-- 서버가 읽는 계약 ②: 신호 사건 뒤 반응 — 종목 × 종류 × 기간 최신 통계
CREATE VIEW forecast.v_signal_reaction AS
SELECT DISTINCT ON (symbol, kind, horizon_days)
  kind, symbol, horizon_days, as_of, sample, q05, q25, q50, q75, q95, up_rate,
  baseline_q05, baseline_q50, baseline_q95, move_ratio, pre_return_5d_median,
  recent_misses, recent_events, renderable, blocked_reason
FROM forecast.event_reaction_stats
WHERE kind IN ('funding_long_crowded', 'funding_short_crowded', 'kimchi_cross_up', 'kimchi_cross_down')
ORDER BY symbol, kind, horizon_days, as_of DESC;
