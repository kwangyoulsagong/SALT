-- F017 v4 순서 3b (2026-11-16) — 사건 반응 창 · 선반영 삼분위. DB-REQ-043 FR-13(신규) · FC-REQ-028 FR-8 · 사전등록 event-window@1.
-- 추가만. 롤백 = DROP VIEW forecast.v_event_window_stat · public.v_dart_filing_export · DROP TABLE forecast.event_window_stat · forecast.event_window.
-- 쓰기는 salt-forecast 만, 서버(coach)는 뷰만 읽는다(db-contract.md §1 · §2). 사용자 열 0 — 종목 · 사건 단위.

-- ① 예측이 DART 공시를 읽는 export 뷰(주인 서버 market — dart_filing, 유니버스 · 1년). 게시 시각 = 서버가 처음 본 시각
CREATE VIEW public.v_dart_filing_export AS
SELECT rcept_no, stock_code, report_name, first_seen_at
FROM public.dart_filing;

-- ② 사건 한 행 — 발표 전 · 뒤 누적 초과 등락. 실행마다 그 키 · 시장을 통째로 다시 쓴다(사건 수 수만 — 창 값은 봉이 닫히면 안 바뀜)
CREATE TABLE forecast.event_window (
  prereg_key   text             NOT NULL,                       -- event-window@1
  market       text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  origin       text             NOT NULL,                       -- news · disclosure · dart
  kind         text             NOT NULL,                       -- news-reaction@2 사전 종류
  symbol       text             NOT NULL,
  ref_at       timestamptz      NOT NULL,                       -- 기준 봉 available_at(게시 전 마지막 일봉)
  published_at timestamptz      NOT NULL,
  pre20        double precision,
  pre5         double precision,
  pre1         double precision,
  post30m      double precision,                               -- 5분봉 있는 날만
  post1        double precision,
  post5        double precision,
  tercile      text             CHECK (tercile IN ('low', 'mid', 'high')),  -- pre5 없으면 NULL
  computed_at  timestamptz      NOT NULL,
  PRIMARY KEY (prereg_key, market, origin, kind, symbol, ref_at)
);

-- ③ 종류 × 선반영 삼분위 × 지평 서술(삼분위 'all' = 그 종류 전체 = p₀). 실행마다 쌓는다
CREATE TABLE forecast.event_window_stat (
  prereg_key     text             NOT NULL,
  market         text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  origin         text             NOT NULL,
  kind           text             NOT NULL,
  tercile        text             NOT NULL CHECK (tercile IN ('low', 'mid', 'high', 'all')),
  horizon        integer          NOT NULL CHECK (horizon > 0),  -- 봉(국내 거래일 · 코인 하루)
  as_of          timestamptz      NOT NULL,
  status         text             NOT NULL CHECK (status IN ('ok', 'below_min')),
  sample         integer          NOT NULL,
  sample_eff     double precision NOT NULL,
  sample_days    integer          NOT NULL,
  up_rate        double precision,
  up_low         double precision,
  up_high        double precision,
  mean           double precision,
  q10            double precision,
  q50            double precision,
  q90            double precision,
  pre5_median    double precision,
  base_up_rate   double precision,                              -- p₀(그 종류 전체 원비율)
  p_holm         double precision,
  differs        text             CHECK (differs IN ('higher', 'lower')),
  pre_low_max    double precision NOT NULL,                     -- 삼분위 경계(시장 × 출처) — 서버가 지금 소식을 같은 경계로 나눈다
  pre_high_min   double precision NOT NULL,
  window_from    timestamptz,
  window_to      timestamptz,
  computed_at    timestamptz      NOT NULL,
  PRIMARY KEY (prereg_key, market, origin, kind, tercile, horizon, as_of),
  CHECK (status = 'ok' OR (up_rate IS NULL AND q50 IS NULL))
);
CREATE INDEX event_window_stat_latest ON forecast.event_window_stat (prereg_key, market, as_of DESC);

-- 서버가 읽는 계약 — 시장마다 최신 실행 한 벌(종류 × 삼분위 × 지평)
CREATE VIEW forecast.v_event_window_stat AS
SELECT s.prereg_key, s.market, s.origin, s.kind, s.tercile, s.horizon, s.as_of, s.status, s.sample, s.sample_eff,
       s.sample_days, s.up_rate, s.up_low, s.up_high, s.mean, s.q10, s.q50, s.q90, s.pre5_median, s.base_up_rate,
       s.differs, s.pre_low_max, s.pre_high_min, s.window_from, s.window_to
FROM forecast.event_window_stat s
JOIN (
  SELECT prereg_key, market, max(as_of) AS as_of FROM forecast.event_window_stat GROUP BY prereg_key, market
) latest USING (prereg_key, market, as_of);
