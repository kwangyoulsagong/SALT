-- DB-REQ-029 FR-18 (2026-09-28, F010 슬라이스 0 성적표 신뢰성) — 카드의 "최근 빗나간 3건"이 게이트가 판정한 kind 만 본다.
-- 전 버전(20260923150000)은 recent_misses 를 kind 구분 없이 forecast.score 에서 뽑고, prediction 과도 kind 없이
-- USING (symbol, horizon_weeks, as_of, model_version) 으로 붙였다. 그래서 백테스트 · 라이브 빗나감이 섞이고,
-- 같은 as_of 에 kind 가 둘이면 행이 두 배로 붙을 수 있었다. 이제 s0.kind = g.score_kind 로 거르고 pr.kind = s.kind 로 붙인다.
-- 컬럼 목록 · 순서는 그대로다(서버 PrismaForecastReader 가 읽는 계약).
-- 롤백 = 이전 마이그레이션(20260923150000_forecast_skill_ci)의 뷰 정의로 CREATE OR REPLACE.

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
          AND s0.model_version = g.model_version AND s0.kind = g.score_kind AND NOT s0.hit90
        ORDER BY s0.as_of DESC LIMIT 3
    ) s
    JOIN forecast.prediction pr
      ON pr.symbol = s.symbol AND pr.horizon_weeks = s.horizon_weeks
     AND pr.as_of = s.as_of AND pr.model_version = s.model_version AND pr.kind = s.kind
) m ON TRUE;
