-- F017 v2 단계 4 (2026-11-11) — 판단 라벨 등급. FC-REQ-028 FR-6 · DB-REQ-043 FR-6 · SRV-REQ-053 FR-7. 사전등록 `judgment-tier@1`.
-- 추가만. 롤백 = DROP VIEW forecast.v_judgment_tier · DROP TABLE forecast.judgment_tier · DROP VIEW public.v_judgment_outcome_export.
--
-- ① 예측은 판단 원장(symbol_judgment_snapshots)을 직접 읽지 않는다(DB-REQ-036 FR-3 목록을 늘리지 않음) — export 뷰로만.
--    채점된 행만 · 사용자 열 0(원장에도 없다). S6 에 coach 스키마로 옮길 때 이 뷰 이름만 옮긴다
CREATE VIEW public.v_judgment_outcome_export AS
SELECT id,
       CASE WHEN signal_type LIKE 'kr_stock.%' THEN 'kr' ELSE 'crypto' END AS market,
       mode, action, rule_version, sample_origin, symbol,
       judged_at, evaluated_at, return_rate::float8 AS return_rate, outcome
FROM public.symbol_judgment_snapshots
WHERE outcome IS NOT NULL AND return_rate IS NOT NULL AND evaluated_at IS NOT NULL;

-- ② 등급 — 쓰기는 salt-forecast 만. 실행마다 칸마다 한 행(지우지 않는다 — 강등 이력이 다음 실행의 입력이다)
CREATE TABLE forecast.judgment_tier (
  prereg_key        text        NOT NULL,
  run_as_of         timestamptz NOT NULL,
  market            text        NOT NULL CHECK (market IN ('crypto', 'kr')),
  mode              text        NOT NULL CHECK (mode IN ('scalp', 'long_term')),
  rule_version      text        NOT NULL,
  tier              text        NOT NULL CHECK (tier IN ('reference', 'verified', 'caution')),
  reason            text        CHECK (reason IN ('no_candidate', 'no_avoid', 'below_effective_n', 'ci_includes_zero', 'regimes_disagree')),
  basis_source      text        CHECK (basis_source IN ('live', 'backtest_full')),  -- 등급을 정한 출처(참고면 NULL)
  live_rows         integer     NOT NULL,
  live_days         integer     NOT NULL,
  live_candidates   integer     NOT NULL,
  live_avoids       integer     NOT NULL,
  live_effective_n  double precision NOT NULL,
  live_spread       double precision,
  live_ci_low       double precision,
  live_ci_high      double precision,
  live_p_holm       double precision,
  regime_first      double precision,                 -- 앞 절반 spread
  regime_second     double precision,                 -- 뒤 절반 spread
  backtest_spread   double precision,                 -- backtest_full (주의 근거로만)
  backtest_ci_low   double precision,
  backtest_ci_high  double precision,
  demoted_at        timestamptz,                      -- 마지막 강등 — 이 뒤 라이브 행만 승격에 센다
  computed_at       timestamptz NOT NULL,
  PRIMARY KEY (prereg_key, market, mode, run_as_of),
  CHECK (tier <> 'reference' OR basis_source IS NULL),
  CHECK (tier = 'reference' OR basis_source IS NOT NULL),
  CHECK (live_ci_low IS NULL OR live_ci_low <= live_ci_high)
);

-- 서버가 읽는 계약 — 칸마다 최신 실행 한 행. 서버는 문턱을 다시 계산하지 않는다
CREATE VIEW forecast.v_judgment_tier AS
SELECT DISTINCT ON (prereg_key, market, mode)
  prereg_key, market, mode, rule_version, run_as_of AS as_of, tier, reason, basis_source,
  live_effective_n, live_spread, live_ci_low, live_ci_high, regime_first, regime_second,
  backtest_ci_low, backtest_ci_high
FROM forecast.judgment_tier
ORDER BY prereg_key, market, mode, run_as_of DESC;
