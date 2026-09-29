-- F010 슬라이스 2 (2026-09-29) — 시장 국면 · BTC 베타. DB-REQ-029 FR-20 · FC-REQ-009.
-- 추가만. 롤백 = DROP VIEW forecast.v_market_regime · DROP TABLE forecast.market_regime ·
--   v_realized_vol 을 앞 정의로 다시 만들고 ALTER TABLE forecast.realized_vol DROP COLUMN btc_beta.
-- 쓰기는 salt-forecast 만, 서버는 뷰만 읽는다(db-contract.md §1 · §2).

-- ① 매일 한 행 — BTC 일봉으로 계산한 국면 재료와 사전등록 regime-gate@1 판정이 채택한 게이트.
-- 게이트 · 이벤트 축소 계수는 **코드 상수**(salt-forecast 커밋)로 정해지고, 여기에는 그날 적용된 값이 남는다.
-- 서버는 다시 계산하지 않는다 — gate_open 과 event_factor 를 그대로 쓴다.
CREATE TABLE forecast.market_regime (
  symbol          text             NOT NULL,
  as_of           timestamptz      NOT NULL,
  last_bar_at     timestamptz      NOT NULL,
  close           double precision NOT NULL CHECK (close > 0),
  sma_200d        double precision,
  trend_open      boolean          NOT NULL,
  hmm_p_high      double precision CHECK (hmm_p_high BETWEEN 0 AND 1),
  hmm_fit_at      timestamptz,
  hmm_sigma_low   double precision,
  hmm_sigma_high  double precision,
  drawdown_365d   double precision CHECK (drawdown_365d <= 0),
  vol_ewma        double precision,  -- 연율(0.52 = 52%)
  gate_key        text,              -- 채택된 게이트(trend · hmm · both). NULL = 채택 없음(게이트를 걸지 않는다)
  gate_open       boolean          NOT NULL,
  event_factor    double precision NOT NULL CHECK (event_factor > 0 AND event_factor <= 1),
  next_event_kind text,
  next_event_at   timestamptz,
  prereg_key      text             NOT NULL,
  computed_at     timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, as_of),
  CHECK (gate_key IS NOT NULL OR gate_open)
);
CREATE INDEX market_regime_latest ON forecast.market_regime (symbol, as_of DESC);

-- 서버가 읽는 계약: 종목별 최신 한 행
CREATE VIEW forecast.v_market_regime AS
SELECT DISTINCT ON (symbol)
  symbol, as_of, last_bar_at, close, sma_200d, trend_open, hmm_p_high, hmm_sigma_low, hmm_sigma_high,
  drawdown_365d, vol_ewma, gate_key, gate_open, event_factor, next_event_kind, next_event_at, prereg_key
FROM forecast.market_regime
ORDER BY symbol, as_of DESC;

-- ② 종목별 BTC 베타 — 90일 일 로그수익 OLS 기울기(둘 다 있는 날 60 미만이면 NULL). 보유 베타 합의 재료
ALTER TABLE forecast.realized_vol ADD COLUMN btc_beta double precision;

CREATE OR REPLACE VIEW forecast.v_realized_vol AS
SELECT DISTINCT ON (symbol)
  symbol, as_of, last_bar_at, sample, annualized, method, blocked_reason,
  ewma, garch, qlike_ewma, qlike_garch, qlike_baseline, btc_beta
FROM forecast.realized_vol
ORDER BY symbol, as_of DESC;
