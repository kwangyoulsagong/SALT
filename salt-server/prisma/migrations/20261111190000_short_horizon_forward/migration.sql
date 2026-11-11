-- F017 v2 단계 5 (2026-11-11) — 단타 방향 확률 사전등록 @3 = 전진 시험. FC-REQ-028 FR-1 · FR-4 · DB-REQ-043 FR-2.
-- 판정 날짜 전 칸은 status 'forward'(사유 awaiting_live) — 예측은 쌓되 화면 확률은 없다. 예측 행에 피처 없는 같은 모델의 확률 p_ref(판정 기준).
-- 추가만. 롤백 = ALTER TABLE forecast.short_horizon_prediction DROP COLUMN p_ref · CHECK 둘을 20261111180000 목록으로.

ALTER TABLE forecast.short_horizon_test DROP CONSTRAINT short_horizon_test_status_check;
ALTER TABLE forecast.short_horizon_test ADD CONSTRAINT short_horizon_test_status_check CHECK (status IN ('pass', 'fail', 'not_tested', 'forward'));

ALTER TABLE forecast.short_horizon_test DROP CONSTRAINT short_horizon_test_blocked_reason_check;
ALTER TABLE forecast.short_horizon_test ADD CONSTRAINT short_horizon_test_blocked_reason_check CHECK (blocked_reason IN (
  'shuffle_failed', 'placebo_failed', 'no_skill', 'miscalibrated', 'no_edge_confident', 'cost', 'insufficient_history',
  'live_underperforms', 'awaiting_live'));

ALTER TABLE forecast.short_horizon_prediction
  ADD COLUMN p_ref double precision CHECK (p_ref IS NULL OR (p_ref >= 0 AND p_ref <= 1));  -- 피처 없는 같은 모델(@3 판정 기준). @1 · @2 행은 NULL
