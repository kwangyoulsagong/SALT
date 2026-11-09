-- F016 단계 C (2026-11-09) — 등락 분해 β · 평소 변동 σ. DB-REQ-041 · FC-REQ-027 FR-1~3.
-- 추가만. 롤백 = DROP VIEW forecast.v_move_beta_export · DROP TABLE forecast.move_beta.
-- 쓰기는 salt-forecast 만, 서버(market)는 export 뷰만 읽는다(db-contract.md §1 · §2 · msa-services.md §5).
--
-- 국내: 종목 일간 로그수익률 = a + β_시장 × 지수 + β_업종 × (업종 − 지수) — 지난 120 거래일(창 · 최소 표본은 예측 설정).
-- 코인: β_시장 = forecast.realized_vol.btc_beta(같은 as_of 이하 최신 — 새 계산 0, FC-REQ-027 FR-2).
-- σ: 지난 60 거래일(코인은 60일) 일간 단순수익률 표준편차 — 서버 카드 조건 |등락| ≥ max(최소 %, k × σ) 의 재료(SRV-REQ-051 FR-8).
-- 사용자 열 0 — 종목 단위다.

CREATE TABLE forecast.move_beta (
  symbol        text        NOT NULL,             -- 국내 6자리 · 코인 KRW-XXX
  as_of         timestamptz NOT NULL,             -- 이 시각까지 닫힌 봉만 봤다(UTC 자정 — 다른 일 작업과 같은 관례)
  asset_class   text        NOT NULL CHECK (asset_class IN ('kr_stock', 'crypto')),
  market_index  text,                             -- 국내 0001 · 1001 / 코인 KRW-BTC
  sector_index  text,                             -- 국내 업종 지수 코드(분류 없음 · 이력 부족이면 NULL)
  beta_market   double precision,                 -- 표본 부족이면 NULL(서버가 β=1 시장 조정)
  beta_sector   double precision,
  beta_sample   integer     NOT NULL DEFAULT 0,
  sigma_daily   double precision,                 -- 일간 단순수익률 표준편차(비율 — 0.021 = 2.1%)
  sigma_sample  integer     NOT NULL DEFAULT 0,
  last_bar_at   timestamptz,                      -- 쓴 마지막 봉의 마감 시각
  computed_at   timestamptz NOT NULL,
  PRIMARY KEY (symbol, as_of)
);
CREATE INDEX move_beta_latest ON forecast.move_beta (symbol, as_of DESC);

-- 서버가 읽는 계약: 종목별 최신 한 행. 신선도는 서버가 as_of 로 판단한다
CREATE VIEW forecast.v_move_beta_export AS
SELECT DISTINCT ON (symbol)
  symbol, as_of, asset_class, market_index, sector_index,
  beta_market, beta_sector, beta_sample, sigma_daily, sigma_sample
FROM forecast.move_beta
ORDER BY symbol, as_of DESC;
