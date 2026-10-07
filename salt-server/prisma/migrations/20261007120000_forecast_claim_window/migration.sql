-- F009 FR-33 — 성적 4요소(기간 · 표본 · 기준 · 빗나간 수). 추가만 — 롤백은 열 삭제 + 이전 뷰 정의.
-- 쓰기 주인은 salt-forecast. 이전 행은 NULL 로 남고 다음 배치가 채운다(서버는 NULL 을 not_recorded 로 읽는다).

-- 변동 범위 게이트: 판정에 쓴 최근 GATE_WINDOW 점수의 첫 · 마지막 as_of 와 90% 범위 밖 수
ALTER TABLE forecast.gate
  ADD COLUMN window_from timestamptz,
  ADD COLUMN window_to   timestamptz,
  ADD COLUMN miss_count  integer;

-- 사건 · 쏠림 반응: 표본 사건의 첫 · 마지막 시각, 빗나간 수와 그 판정 대상 수(앞 사건이 MIN_SAMPLE 개 이상일 때만 판정)
ALTER TABLE forecast.event_reaction_stats
  ADD COLUMN window_from timestamptz,
  ADD COLUMN window_to   timestamptz,
  ADD COLUMN miss_count  integer,
  ADD COLUMN miss_judged integer;

CREATE OR REPLACE VIEW forecast.v_forecast_card AS
SELECT
    g.symbol, g.horizon_weeks, p.as_of, g.model_version, p.base_close,
    p.q05, p.q10, p.q25, p.q50, p.q75, p.q90, p.q95, p.p_up, p.direction,
    g.renderable AND p.as_of IS NOT NULL AS renderable,
    CASE WHEN p.as_of IS NULL THEN 'no_live_prediction' ELSE g.blocked_reason END AS blocked_reason,
    g.score_kind, g.sample, g.coverage90, g.width90, g.baseline_width90, g.pinball_skill,
    g.direction_calls, g.direction_hits, g.always_up_rate, g.evaluated_at,
    COALESCE(m.misses, '[]'::jsonb) AS recent_misses,
    g.direction_base_rate,
    g.range_renderable AND p.as_of IS NOT NULL AS range_renderable,
    CASE WHEN p.as_of IS NULL THEN 'no_live_prediction' ELSE g.range_blocked_reason END AS range_blocked_reason,
    g.pinball_skill_ci_low,
    g.window_from, g.window_to, g.miss_count
FROM forecast.gate g
LEFT JOIN LATERAL (
    SELECT * FROM forecast.prediction pr
    WHERE pr.symbol = g.symbol AND pr.horizon_weeks = g.horizon_weeks
      AND pr.model_version = g.model_version AND pr.kind = 'live'
    ORDER BY pr.as_of DESC LIMIT 1
) p ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
               'asOf', s.as_of, 'realized', s.realized, 'q05', pr.q05, 'q95', pr.q95)
           ORDER BY s.as_of DESC) AS misses
    FROM (
        SELECT * FROM forecast.score s0
        WHERE s0.symbol = g.symbol AND s0.horizon_weeks = g.horizon_weeks
          AND s0.model_version = g.model_version AND s0.kind = g.score_kind AND NOT s0.hit90
        ORDER BY s0.as_of DESC LIMIT 3
    ) s
    JOIN forecast.prediction pr
      ON pr.symbol = s.symbol AND pr.horizon_weeks = s.horizon_weeks
     AND pr.as_of = s.as_of AND pr.model_version = s.model_version AND pr.kind = s.kind
) m ON TRUE;

CREATE OR REPLACE VIEW forecast.v_event_card AS
SELECT
  e.kind, e.event_at, e.announced_at, e.source,
  s.symbol, s.horizon_days, s.as_of, s.sample,
  s.q05, s.q25, s.q50, s.q75, s.q95, s.up_rate,
  s.baseline_q05, s.baseline_q50, s.baseline_q95, s.move_ratio, s.pre_return_5d_median,
  s.recent_misses, s.recent_events, s.renderable, s.blocked_reason,
  s.window_from, s.window_to, s.miss_count, s.miss_judged
FROM forecast.scheduled_event e
JOIN LATERAL (
  SELECT DISTINCT ON (st.symbol, st.horizon_days) st.*
  FROM forecast.event_reaction_stats st
  WHERE st.kind = e.kind
  ORDER BY st.symbol, st.horizon_days, st.as_of DESC
) s ON true
WHERE e.event_at >= now() - interval '1 day'
  AND e.event_at <  now() + interval '35 days';

CREATE OR REPLACE VIEW forecast.v_signal_reaction AS
SELECT DISTINCT ON (symbol, kind, horizon_days)
  kind, symbol, horizon_days, as_of, sample, q05, q25, q50, q75, q95, up_rate,
  baseline_q05, baseline_q50, baseline_q95, move_ratio, pre_return_5d_median,
  recent_misses, recent_events, renderable, blocked_reason,
  window_from, window_to, miss_count, miss_judged
FROM forecast.event_reaction_stats
WHERE kind IN ('funding_long_crowded', 'funding_short_crowded', 'kimchi_cross_up', 'kimchi_cross_down')
ORDER BY symbol, kind, horizon_days, as_of DESC;
