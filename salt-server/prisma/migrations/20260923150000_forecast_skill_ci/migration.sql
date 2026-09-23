-- DB-REQ-029 FR-12 (2026-09-23, F008 슬라이스 20) — 기준 대비 개선의 95% 하한(짝지은 부트스트랩).
-- 슬라이스 16 에서 1,156 조합 중 200 이 "이겼다" — 대부분 다중 비교의 우연으로 보였다. 전망은 하한 > 0 일 때만 켠다.
ALTER TABLE forecast.gate ADD COLUMN pinball_skill_ci_low DOUBLE PRECISION;

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
    g.pinball_skill_ci_low
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
          AND s0.model_version = g.model_version AND NOT s0.hit90
        ORDER BY s0.as_of DESC LIMIT 3
    ) s
    JOIN forecast.prediction pr USING (symbol, horizon_weeks, as_of, model_version)
) m ON TRUE;
