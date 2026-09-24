-- DB-REQ-031 FR-8 (2026-09-24, F009 슬라이스 2 · FC-REQ-006) — 종목 실현 변동성(EWMA · GARCH(1,1)) 일 1회.
-- 쓰기는 salt-forecast 만, 서버는 v_realized_vol 뷰만 읽는다(db-contract.md §1 · §2). 추가만 — 롤백은 DROP 두 줄.
-- 변동성은 연율(0.52 = 52%, 365 일). QLIKE 는 표본 밖 180 일 다음 날 분산 예측 손실(작을수록 좋다).
CREATE TABLE forecast.realized_vol (
  symbol          text             NOT NULL,
  as_of           timestamptz      NOT NULL,
  last_bar_at     timestamptz,
  sample          integer          NOT NULL,
  ewma            double precision,
  garch           double precision,
  garch_alpha     double precision,
  garch_beta      double precision,
  qlike_ewma      double precision,
  qlike_garch     double precision,
  qlike_baseline  double precision,
  method          text             CHECK (method IN ('ewma', 'garch')),
  annualized      double precision CHECK (annualized > 0),
  blocked_reason  text,
  computed_at     timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, as_of),
  CHECK ((annualized IS NULL) = (blocked_reason IS NOT NULL))
);
CREATE INDEX realized_vol_latest ON forecast.realized_vol (symbol, as_of DESC);

-- 서버가 읽는 계약: 종목별 최신 한 행. 막힌 행도 준다(사유를 서버가 안다)
CREATE VIEW forecast.v_realized_vol AS
SELECT DISTINCT ON (symbol)
  symbol, as_of, last_bar_at, sample, annualized, method, blocked_reason,
  ewma, garch, qlike_ewma, qlike_garch, qlike_baseline
FROM forecast.realized_vol
ORDER BY symbol, as_of DESC;
