-- DB-REQ-029 FR-10 · FR-11 (2026-09-23, F008 슬라이스 16b)

-- FR-10 변동 범위 게이트를 방향 · 기준 대비 게이트에서 분리한다(사용자 결정 "변동 범위 켜고").
-- 변동 범위는 보정(90% 커버리지) · 표본 · 신선도만 보면 켠다. 기준을 이겼는지는 같이 보여 줄 뿐 조건이 아니다.
ALTER TABLE forecast.gate ADD COLUMN range_renderable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE forecast.gate ADD COLUMN range_blocked_reason TEXT;

-- FR-11 시계열 한 점. 같은 관측 시각이라도 발표 후 수정되면 available_at 이 다른 행(빈티지)으로 쌓는다.
CREATE TABLE forecast.series_point (
    source        TEXT             NOT NULL,
    series_id     TEXT             NOT NULL,
    observed_at   TIMESTAMPTZ      NOT NULL,
    available_at  TIMESTAMPTZ      NOT NULL,
    value         DOUBLE PRECISION NOT NULL,
    unit          TEXT             NOT NULL,
    ingested_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
    PRIMARY KEY (source, series_id, observed_at, available_at)
);
CREATE INDEX series_point_series_available_idx ON forecast.series_point (source, series_id, available_at);

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
    g.direction_base_rate,
    g.range_renderable AND p.as_of IS NOT NULL AS range_renderable,
    CASE WHEN p.as_of IS NULL THEN 'no_live_prediction' ELSE g.range_blocked_reason END AS range_blocked_reason
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
