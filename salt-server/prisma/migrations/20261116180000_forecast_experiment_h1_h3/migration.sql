-- F017 v4 순서 4 (2026-11-16) — 예측 실험 H1 vol-range@1 · H3 move-news@1 전진 시험. DB-REQ-043 FR-14(신규) · FC-REQ-028 FR-9.
-- 추가만. 롤백 = DROP TABLE forecast.vol_range_test · vol_range_prediction · move_news_event · move_news_test.
-- 쓰기는 salt-forecast 만. 서버는 아직 읽지 않는다 — 첫 판정 날짜(2027-01-12)에 통과 칸이 생기면 뷰를 같은 PR 로(db-contract.md §2).
-- 사용자 열 0 — 종목 · 시장 단위.

-- ① H1 칸 시험 — 실행마다 칸(시장 × 지평)마다 한 행. 1차(과거 walk-forward) · 전진 · 판정 상태
CREATE TABLE forecast.vol_range_test (
  prereg_key      text             NOT NULL,                       -- vol-range@1
  market          text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  horizon         integer          NOT NULL CHECK (horizon > 0),   -- 봉(국내 거래일 · 코인 하루)
  run_as_of       timestamptz      NOT NULL,
  model_version   text,
  status          text             NOT NULL CHECK (status IN ('history_short', 'forward', 'pass', 'fail')),
  reason          text,
  window_from     timestamptz,
  window_to       timestamptz,
  eval_rows       integer          NOT NULL,
  eval_days       integer          NOT NULL,
  excluded_nonpos integer          NOT NULL,
  qlike_har       double precision,
  qlike_b1        double precision,
  qlike_b2        double precision,
  qlike_b3        double precision,
  p_holm_b1       double precision,
  p_holm_b2       double precision,
  p_holm_b3       double precision,
  cover80         double precision,
  cover95         double precision,
  cover_rows      integer          NOT NULL,
  cover_by_year   jsonb            NOT NULL,                       -- {"2025": {"0.8": …, "0.95": …}}
  placebo_pass    boolean          NOT NULL,
  forward         jsonb            NOT NULL,                       -- 전진 표본 지표(rows · days · qlike · p · cover)
  looks_done      integer          NOT NULL DEFAULT 0,
  live_params     jsonb,                                           -- 마지막 적합(β · s²) · 컨포멀 배수
  live_ready      boolean          NOT NULL DEFAULT false,         -- 화면 허가 — 판정 날짜에 pass 한 칸만
  computed_at     timestamptz      NOT NULL,
  PRIMARY KEY (prereg_key, market, horizon, run_as_of),
  CHECK (NOT live_ready OR status = 'pass')
);

-- ② H1 전진 예측 — 기준 봉마다 종목마다. 라벨이 닫히면 실현값 · 제때 기록 여부를 채운다
CREATE TABLE forecast.vol_range_prediction (
  prereg_key    text             NOT NULL,
  market        text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  horizon       integer          NOT NULL CHECK (horizon > 0),
  symbol        text             NOT NULL,
  ref_at        timestamptz      NOT NULL,                         -- 기준 봉 available_at
  model_version text             NOT NULL,
  rv_har        double precision NOT NULL,
  rv_b1         double precision,
  rv_b2         double precision,
  rv_b3         double precision,
  half80        double precision,                                  -- 80% 구간 반폭(로그수익) — 컨포멀 보정 창이 모자라면 NULL
  half95        double precision,
  recorded_at   timestamptz      NOT NULL,
  realized_rv   double precision,
  realized_r    double precision,
  in_time       boolean,                                           -- recorded_at < 봉 t+1 available_at
  scored_at     timestamptz,
  PRIMARY KEY (prereg_key, market, horizon, symbol, ref_at)
);
CREATE INDEX vol_range_prediction_open ON forecast.vol_range_prediction (prereg_key, market, horizon) WHERE scored_at IS NULL;

-- ③ H3 사건 — 라벨이 닫히기 전에 기록. 소식 유무 · 거래량은 기록 시각 값 그대로(다시 쓰지 않는다)
CREATE TABLE forecast.move_news_event (
  prereg_key   text             NOT NULL,                          -- move-news@1
  market       text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  symbol       text             NOT NULL,
  ref_at       timestamptz      NOT NULL,                          -- 사건 봉 available_at
  r            double precision NOT NULL,
  sigma        double precision NOT NULL,
  news_count   integer          NOT NULL,
  volume_high  boolean          NOT NULL,
  covered      boolean          NOT NULL,                          -- 최근 30일 소식 ≥ 3(견고성 표본)
  source_ok    boolean          NOT NULL,                          -- 그 창에 시장 소식이 1건 이상(수집 멈춤 아님)
  recorded_at  timestamptz      NOT NULL,
  s1           double precision,
  s5           double precision,
  cost1        double precision,
  cost5        double precision,
  in_time1     boolean,
  in_time5     boolean,
  scored_at    timestamptz,
  PRIMARY KEY (prereg_key, market, symbol, ref_at)
);

-- ④ H3 칸 × 검정 — 실행마다. origin = reference(과거 — 판정 아님) · forward(전진 표본)
CREATE TABLE forecast.move_news_test (
  prereg_key       text             NOT NULL,
  market           text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  horizon          integer          NOT NULL CHECK (horizon > 0),
  test             text             NOT NULL CHECK (test IN ('news_up', 'quiet_down', 'diff')),
  origin           text             NOT NULL CHECK (origin IN ('reference', 'forward')),
  run_as_of        timestamptz      NOT NULL,
  status           text             NOT NULL CHECK (status IN ('forward', 'pass', 'fail', 'reference')),
  reason           text,
  events           integer          NOT NULL,
  days             integer          NOT NULL,
  stat             double precision,
  t                double precision,
  p                double precision,
  p_holm           double precision,
  placebo_q95      double precision,
  placebo_pass     boolean          NOT NULL,
  robust_same_sign boolean          NOT NULL,
  detail           jsonb            NOT NULL,                      -- 집단 넷 · 거래량별 · 비용 뒤
  looks_done       integer          NOT NULL DEFAULT 0,
  computed_at      timestamptz      NOT NULL,
  PRIMARY KEY (prereg_key, market, horizon, test, origin, run_as_of)
);
