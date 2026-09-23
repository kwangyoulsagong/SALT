-- DB-REQ-029 FR-9 (2026-09-23) — 방향 적중률의 비교 기준.
-- 백테스트에서 판정이 거의 전부 "내린다"였고 적중률(58%)이 그 주들의 하락 비율(58%)과 같았다.
-- "항상 오른다" 비율만으로는 이걸 못 드러낸다 → 판정한 방향 그대로 항상 찍었을 때의 적중률을 같이 둔다.

ALTER TABLE forecast.gate ADD COLUMN direction_base_rate DOUBLE PRECISION;

CREATE OR REPLACE VIEW forecast.v_forecast_card AS
SELECT
    g.symbol,
    g.horizon_weeks,
    p.as_of,
    g.model_version,
    p.base_close,
    p.q05, p.q10, p.q25, p.q50, p.q75, p.q90, p.q95,
    p.p_up,
    p.direction,
    g.renderable AND p.as_of IS NOT NULL AS renderable,
    CASE WHEN p.as_of IS NULL THEN 'no_live_prediction' ELSE g.blocked_reason END AS blocked_reason,
    g.score_kind,
    g.sample,
    g.coverage90,
    g.width90,
    g.baseline_width90,
    g.pinball_skill,
    g.direction_calls,
    g.direction_hits,
    g.always_up_rate,
    g.evaluated_at,
    COALESCE(m.misses, '[]'::jsonb) AS recent_misses,
    g.direction_base_rate
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
