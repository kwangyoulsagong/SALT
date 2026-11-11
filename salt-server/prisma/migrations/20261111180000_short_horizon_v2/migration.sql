-- F017 v2 단계 5 (2026-11-11) — 단타 방향 확률 사전등록 @2. FC-REQ-028 FR-1 · DB-REQ-043 FR-2 · SRV-REQ-053 FR-5.
-- @1 의 결함(365일 기후값 기준 · 날짜 안 셔플)을 고친 @2 는 같은 기간을 이미 봤다 → 시험 통과 = 라이브 원장 발행 허가,
-- 화면 확률은 등록 뒤 라이브 확신 ≥ 300 · (적중 − 늘 오른다) 하한 > 0 일 때만(`live_ready`). 그 전 사유 `awaiting_live`.
-- 추가 · 뷰 교체만. 롤백 = 아래 뷰 둘을 20261111170000 정의로 다시 만들고 ALTER TABLE … DROP COLUMN live_ready, bss_climatology ·
--   CHECK 를 이전 목록으로.

ALTER TABLE forecast.short_horizon_test
  ADD COLUMN live_ready boolean NOT NULL DEFAULT false,      -- @2 화면 허가(예측 배치가 정한다 — 서버는 다시 세지 않는다)
  ADD COLUMN bss_climatology double precision;                -- 기후값 대비 BSS(참고 — @1 과 이어 보기). bss = 판정 기준 대비(@2 = 피처 없는 모델)
COMMENT ON COLUMN forecast.short_horizon_test.shuffle_ci_low IS '플라시보 피처 몫 BSS 95% 하한 — @1 날짜 안 셔플 · @2 종목마다 8~30일 미룸';

ALTER TABLE forecast.short_horizon_test DROP CONSTRAINT short_horizon_test_blocked_reason_check;
ALTER TABLE forecast.short_horizon_test ADD CONSTRAINT short_horizon_test_blocked_reason_check CHECK (blocked_reason IN (
  'shuffle_failed', 'placebo_failed', 'no_skill', 'miscalibrated', 'no_edge_confident', 'cost', 'insufficient_history', 'live_underperforms'));

-- 뷰는 칸을 **키마다** 최신으로 고른다 — @1 · @2 행이 같은 표에 있어도 서버가 고른 키만 본다(전 정의는 키를 섞어 최신을 골랐다)
DROP VIEW forecast.v_short_horizon_card;
DROP VIEW forecast.v_short_horizon_cell;

CREATE VIEW forecast.v_short_horizon_cell AS
SELECT DISTINCT ON (prereg_key, market, horizon)
  prereg_key, market, horizon, run_as_of AS as_of, model_version, status, blocked_reason, live_ready, window_from, window_to,
  eval_rows, bss, ece, track_origin, confident_calls, confident_hits, always_up_hits, misses
FROM forecast.short_horizon_test
ORDER BY prereg_key, market, horizon, run_as_of DESC;

CREATE VIEW forecast.v_short_horizon_card AS
SELECT DISTINCT ON (p.prereg_key, p.symbol, p.horizon)
  p.prereg_key, p.symbol, p.market, p.horizon, p.as_of, p.model_version, p.p_up, p.q10, p.q50, p.q90,
  p.ref_price, p.invalidation, p.expires_at,
  (c.status = 'pass' AND c.live_ready AND c.model_version = p.model_version AND p.expires_at > now()) AS renderable,
  CASE
    WHEN c.status IS DISTINCT FROM 'pass' THEN COALESCE(c.blocked_reason, 'no_skill')
    WHEN NOT c.live_ready THEN 'awaiting_live'
    WHEN c.model_version IS DISTINCT FROM p.model_version THEN 'stale'
    WHEN p.expires_at <= now() THEN 'stale'
  END AS blocked_reason
FROM forecast.short_horizon_prediction p
LEFT JOIN forecast.v_short_horizon_cell c ON c.prereg_key = p.prereg_key AND c.market = p.market AND c.horizon = p.horizon
ORDER BY p.prereg_key, p.symbol, p.horizon, p.as_of DESC;
