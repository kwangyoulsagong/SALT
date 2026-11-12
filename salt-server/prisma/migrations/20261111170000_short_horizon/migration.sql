-- F017 v2 단계 5 (2026-11-11) — 단타 방향 확률. FC-REQ-028 FR-1 · FR-4 · DB-REQ-043 FR-2 · SRV-REQ-053 FR-5. 사전등록 `short-direction@1`.
-- 추가만. 롤백 = DROP VIEW forecast.v_short_horizon_card · forecast.v_short_horizon_cell · DROP TABLE forecast.short_horizon_outcome ·
--   forecast.short_horizon_prediction · forecast.short_horizon_test.
-- 쓰기는 salt-forecast 만, 서버는 두 뷰만 읽는다(db-contract.md §1 · §2).

-- ① 시험 — 실행마다 칸(시장 × 지평)마다 한 행. 지우지 않는다(시험 이력). 시험 안 한 칸도 행(status not_tested) — 화면 사유가 한 곳에서 나온다
CREATE TABLE forecast.short_horizon_test (
  prereg_key        text        NOT NULL,
  run_as_of         timestamptz NOT NULL,
  market            text        NOT NULL CHECK (market IN ('crypto', 'kr')),
  horizon           text        NOT NULL CHECK (horizon IN ('1h', '4h', '1d')),
  model_version     text,
  status            text        NOT NULL CHECK (status IN ('pass', 'fail', 'not_tested')),
  blocked_reason    text        CHECK (blocked_reason IN ('shuffle_failed', 'no_skill', 'miscalibrated', 'no_edge_confident', 'cost', 'insufficient_history', 'live_underperforms')),
  window_from       timestamptz,
  window_to         timestamptz,
  eval_rows         integer     NOT NULL DEFAULT 0,
  bss               double precision,
  bss_ci_low        double precision,
  bss_ci_high       double precision,
  bss_p_holm        double precision,
  bss_persistence   double precision,
  ece               double precision,
  track_origin      text        NOT NULL DEFAULT 'backtest' CHECK (track_origin IN ('backtest', 'live')),  -- 아래 성적 묶음의 출처(합산 0)
  confident_calls   integer     NOT NULL DEFAULT 0,
  confident_hits    integer     NOT NULL DEFAULT 0,
  always_up_hits    integer     NOT NULL DEFAULT 0,               -- 같은 확신 행에서 '늘 오른다'가 맞은 수
  hit_diff_ci_low   double precision,
  hit_diff_ci_high  double precision,
  net_mean          double precision,                              -- 확신 '오름' 비용 뒤 평균 로그수익
  shuffle_ci_low    double precision,
  shuffle_ci_high   double precision,
  reliability       jsonb       NOT NULL DEFAULT '[]'::jsonb,       -- [[행, 말한 평균, 실제]] 10 구간 — 리포트 · 화면 표시용(조건 아님)
  misses            jsonb       NOT NULL DEFAULT '[]'::jsonb,       -- [{asOf, symbol, pUp, realized}] 최근 3 — 화면 '빗나간 사례'
  z_quantiles       jsonb       NOT NULL DEFAULT '{}'::jsonb,       -- {low|mid|high: [q10, q50, q90]} 표준화 수익 — 라이브 분위 입력
  live_params       jsonb,                                         -- 마지막 블록 적합(표준화 · 계수 · 기후값 · Beta) — 라이브 예측이 그대로 쓴다
  computed_at       timestamptz NOT NULL,
  PRIMARY KEY (prereg_key, market, horizon, run_as_of),
  CHECK (status <> 'pass' OR blocked_reason IS NULL),
  CHECK (status = 'pass' OR blocked_reason IS NOT NULL),
  CHECK (bss_ci_low IS NULL OR bss_ci_low <= bss_ci_high)
);

-- ② 라이브 예측 — 통과한 칸만 쓴다(불변식 1). 분위는 로그수익, 무효선 = 기준 가격 × exp(q10)
CREATE TABLE forecast.short_horizon_prediction (
  symbol         text        NOT NULL,
  horizon        text        NOT NULL CHECK (horizon IN ('1h', '4h', '1d')),
  as_of          timestamptz NOT NULL,                             -- 기준 봉 마감
  model_version  text        NOT NULL,
  prereg_key     text        NOT NULL,
  market         text        NOT NULL CHECK (market IN ('crypto', 'kr')),
  p_up           double precision NOT NULL CHECK (p_up >= 0 AND p_up <= 1),
  q10            double precision NOT NULL,
  q50            double precision NOT NULL,
  q90            double precision NOT NULL,
  ref_price      numeric     NOT NULL,
  invalidation   numeric     NOT NULL,
  expires_at     timestamptz NOT NULL,                             -- 기준 시각 + 지평(국내 1d = 다음 거래일 종가) — 지나면 화면에 내지 않는다
  available_at   timestamptz NOT NULL,
  PRIMARY KEY (symbol, horizon, as_of, model_version),
  CHECK (q10 <= q50 AND q50 <= q90),
  CHECK (expires_at > as_of)
);
CREATE INDEX short_horizon_prediction_latest_idx ON forecast.short_horizon_prediction (symbol, horizon, as_of DESC);

-- ③ 라이브 채점 — 예측 한 줄 = 결과 한 줄(FR-4). 지평이 지난 예측만
CREATE TABLE forecast.short_horizon_outcome (
  symbol          text        NOT NULL,
  horizon         text        NOT NULL,
  as_of           timestamptz NOT NULL,
  model_version   text        NOT NULL,
  realized        double precision NOT NULL,                       -- ln(C_end / ref_price)
  up              boolean     NOT NULL,
  scored_at       timestamptz NOT NULL,
  PRIMARY KEY (symbol, horizon, as_of, model_version),
  FOREIGN KEY (symbol, horizon, as_of, model_version) REFERENCES forecast.short_horizon_prediction (symbol, horizon, as_of, model_version)
);

-- 서버가 읽는 계약 ① — 칸마다 최신 시험 한 행. 서버는 문턱을 다시 계산하지 않는다
CREATE VIEW forecast.v_short_horizon_cell AS
SELECT DISTINCT ON (market, horizon)
  prereg_key, market, horizon, run_as_of AS as_of, model_version, status, blocked_reason, window_from, window_to,
  eval_rows, bss, ece, track_origin, confident_calls, confident_hits, always_up_hits, misses
FROM forecast.short_horizon_test
ORDER BY market, horizon, run_as_of DESC;

-- 서버가 읽는 계약 ② — 종목 × 지평 최신 예측 하나 + 그 칸 시험. renderable = 칸 통과 · 같은 모델 · 만료 전
CREATE VIEW forecast.v_short_horizon_card AS
SELECT DISTINCT ON (p.symbol, p.horizon)
  p.symbol, p.market, p.horizon, p.as_of, p.model_version, p.p_up, p.q10, p.q50, p.q90,
  p.ref_price, p.invalidation, p.expires_at,
  (c.status = 'pass' AND c.model_version = p.model_version AND p.expires_at > now()) AS renderable,
  CASE
    WHEN c.status IS DISTINCT FROM 'pass' THEN COALESCE(c.blocked_reason, 'no_skill')
    WHEN c.model_version IS DISTINCT FROM p.model_version THEN 'stale'
    WHEN p.expires_at <= now() THEN 'stale'
  END AS blocked_reason
FROM forecast.short_horizon_prediction p
LEFT JOIN forecast.v_short_horizon_cell c ON c.market = p.market AND c.horizon = p.horizon
ORDER BY p.symbol, p.horizon, p.as_of DESC;
