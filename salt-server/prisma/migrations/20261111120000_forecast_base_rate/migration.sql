-- F017 v2 단계 2 (2026-11-11) — 조건부 기저율 · 라이브 조건 문턱. DB-REQ-043 FR-3 · FC-REQ-028 FR-2.
-- 추가만. 롤백 = DROP VIEW forecast.v_base_rate_trigger · forecast.v_base_rate · DROP TABLE forecast.base_rate_trigger · forecast.base_rate_stat.
-- 쓰기는 salt-forecast 만, 서버(coach)는 뷰만 읽는다(db-contract.md §1 · §2).
--
-- 조건 정의 · 임계 · 비용 · 문턱은 사전등록 `base-rate@1`(salt-forecast/preregistration/2026-11-11-base-rate.toml) 한 곳.
-- DB-REQ-043 FR-3 초안의 키 `(condition_id, symbol, horizon, as_of)` 를 **시장 풀링**으로 바꿨다 — 종목 하나의 조건 표본은
-- 유효 n 100 · 서로 다른 날 60 을 거의 넘지 못한다(국내 K4 · 코인 C2 는 시장 전체로도 수백). 종목 열은 문턱 표에만 있다.
-- 사용자 열 0 — 시장 · 종목 단위다(기저율은 사람마다 같다, FC-REQ-028 불변식 3).

CREATE TABLE forecast.base_rate_stat (
  prereg_key      text        NOT NULL,             -- base-rate@1
  market          text        NOT NULL CHECK (market IN ('kr', 'crypto')),
  condition_id    text        NOT NULL,             -- 'ALL'(평소) · K1 … · C1 …
  horizon         integer     NOT NULL CHECK (horizon > 0), -- 국내 거래일 · 코인 하루
  as_of           timestamptz NOT NULL,             -- 이 시각까지 닫힌 봉만 봤다
  kind            text        NOT NULL CHECK (kind IN ('usual', 'test', 'describe')),
  status          text        NOT NULL CHECK (status IN ('ok', 'below_min')),
  sample          integer     NOT NULL,             -- 사건 수(쿨다운 뒤)
  sample_eff      double precision NOT NULL,        -- 같은 날 몰림 보정 유효 n
  sample_days     integer     NOT NULL,             -- 서로 다른 날
  -- 사기 전(비용 뒤 로그수익). below_min 이면 전부 NULL
  up_rate         double precision,                 -- 원비율
  up_rate_shrunk  double precision,                 -- 베타–이항 수축(κ 100 → 평소)
  up_low          double precision,                 -- Wilson 95% (유효 n)
  up_high         double precision,
  mean            double precision,
  q10             double precision,
  q50             double precision,
  q90             double precision,
  -- 팔기 전 보유 연장(비용 없음 — 파는 비용은 지금이나 나중이나 같다)
  hold_up_rate    double precision,
  hold_q10        double precision,
  hold_q50        double precision,
  hold_q90        double precision,
  p_holm          double precision,                 -- 평소 대비 Holm 보정 p(평소 · 서술 조건은 NULL)
  differs         text        CHECK (differs IN ('higher', 'lower')), -- Holm 통과 때만
  recent_differs  boolean,                          -- 최근 365일이 전체 Wilson 밖(최근 유효 n < 30 이면 NULL)
  window_start    date        NOT NULL,
  window_end      date        NOT NULL,
  computed_at     timestamptz NOT NULL,
  PRIMARY KEY (prereg_key, market, condition_id, horizon, as_of),
  CHECK (status = 'ok' OR (up_rate IS NULL AND q10 IS NULL AND hold_q50 IS NULL))
);
CREATE INDEX base_rate_stat_latest ON forecast.base_rate_stat (prereg_key, market, as_of DESC);

-- 라이브 판정 문턱 — 마지막 봉 기준. 서버는 지금 가격 · 시가 · 거래대금을 이 숫자와 비교만 한다(조건 정의는 예측 한 곳).
-- 성립할 수 없는 조건(예: K6 직전 이틀이 안 내림)은 행이 없다.
-- applies_to: 'next' = 마지막 봉 다음 장(라이브 가격과 비교) · 'closed' = 마지막 봉 종가에 이미 성립(문턱 열 전부 NULL).
-- 국내는 장 마감 뒤 작업이 돌면 오늘이 이미 마지막 봉이다 — 그 저녁에 '오늘 크게 내림'을 말하려면 'closed' 가 필요하다
CREATE TABLE forecast.base_rate_trigger (
  prereg_key      text        NOT NULL,
  market          text        NOT NULL CHECK (market IN ('kr', 'crypto')),
  symbol          text        NOT NULL,             -- 국내 6자리 · 코인 KRW-XXX
  condition_id    text        NOT NULL,
  applies_to      text        NOT NULL CHECK (applies_to IN ('next', 'closed')),
  as_of           timestamptz NOT NULL,             -- base_rate_stat 같은 실행
  ref_close       numeric     NOT NULL,             -- 마지막 봉 종가(오늘 수익의 분모)
  ref_at          timestamptz NOT NULL,             -- 그 봉의 available_at — 서버가 신선도(기준 종가가 며칠 묵었나)를 이것으로 본다
  price_at_least  numeric,                          -- 지금 가격 ≥ (NULL = 조건 없음)
  price_at_most   numeric,                          -- 지금 가격 ≤
  open_at_least   numeric,                          -- 오늘 시가 ≥ (국내 K3)
  value_at_least  numeric,                          -- 오늘 거래대금(원) ≥ (국내 K2)
  PRIMARY KEY (prereg_key, symbol, condition_id, applies_to, as_of),
  CHECK (applies_to = 'next' OR (price_at_least IS NULL AND price_at_most IS NULL AND open_at_least IS NULL AND value_at_least IS NULL))
);
CREATE INDEX base_rate_trigger_symbol ON forecast.base_rate_trigger (symbol, as_of DESC);

-- 서버가 읽는 계약 ① — 시장 · 조건 · 지평마다 최신 실행 한 행
CREATE VIEW forecast.v_base_rate AS
SELECT DISTINCT ON (prereg_key, market, condition_id, horizon)
  prereg_key, market, condition_id, horizon, as_of, kind, status,
  sample, sample_eff, sample_days,
  up_rate, up_rate_shrunk, up_low, up_high, mean, q10, q50, q90,
  hold_up_rate, hold_q10, hold_q50, hold_q90,
  differs, recent_differs, window_start, window_end
FROM forecast.base_rate_stat
ORDER BY prereg_key, market, condition_id, horizon, as_of DESC;

-- 서버가 읽는 계약 ② — 시장마다 **최신 실행**의 문턱만. 종목별 최신으로 고르면 이번 실행에 문턱이 없는 종목이
-- 옛 실행의 문턱을 끌고 온다(조건이 끝났는데 맞다고 말함)
CREATE VIEW forecast.v_base_rate_trigger AS
SELECT t.prereg_key, t.market, t.symbol, t.condition_id, t.applies_to, t.as_of,
       t.ref_close, t.ref_at, t.price_at_least, t.price_at_most, t.open_at_least, t.value_at_least
FROM forecast.base_rate_trigger t
JOIN (
  SELECT prereg_key, market, max(as_of) AS as_of
  FROM forecast.base_rate_stat
  GROUP BY prereg_key, market
) latest USING (prereg_key, market, as_of);
