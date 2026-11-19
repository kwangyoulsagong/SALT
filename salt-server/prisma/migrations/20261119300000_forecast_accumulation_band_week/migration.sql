-- DB-REQ-013 개정(2026-11-19, F003 v2 순서 2 · SRV-REQ-020 FR-74 · FR-23) — 추가만.
-- ① 밴드 표 열: 화면 밴드 표가 판정과 같은 줄(사전등록)을 그린다. 서버 · 프론트에 임계 상수 0.
-- ② 주별 뷰: 사용자가 열지 않은 지난 주를 그 주 밴드로 마감한다(최신 한 행 뷰로는 지난 주를 모른다).
-- 쓰기는 salt-forecast 만(db-contract.md §1). 롤백: DROP VIEW forecast.v_accumulation_band_week; 아래 v_accumulation_band 를
-- 20261119200000 정의로 되돌린 뒤 ALTER TABLE forecast.accumulation_band DROP COLUMN bands;

ALTER TABLE forecast.accumulation_band ADD COLUMN bands jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 열을 끝에 더한다(CREATE OR REPLACE VIEW 는 기존 열 순서를 바꿀 수 없다)
CREATE OR REPLACE VIEW forecast.v_accumulation_band AS
SELECT DISTINCT ON (asset)
       asset, plan_week, prereg_key, indicator, indicator_value, percentile, estimated, basis_observed, secondary_value,
       band_key, band_multiplier, gate_passed, blocked_reason, multiplier, closed_weeks, excess, ci_low, ci_high,
       years_total, years_positive, window_from, window_to, failure_cases, failure_count, kimchi_premium, kimchi_as_of, computed_at,
       bands
FROM forecast.accumulation_band
ORDER BY asset, plan_week DESC, computed_at DESC;

-- 자산 × 결정일 한 행(같은 주에 키가 둘이면 나중에 계산한 것) — 서버 plan 이 지난 주 마감 · 이번 주 스냅샷에 쓴다
CREATE VIEW forecast.v_accumulation_band_week AS
SELECT DISTINCT ON (asset, plan_week)
       asset, plan_week, prereg_key, indicator, indicator_value, percentile, estimated, basis_observed, secondary_value,
       band_key, band_multiplier, gate_passed, blocked_reason, multiplier, closed_weeks, excess, ci_low, ci_high,
       years_total, years_positive, window_from, window_to, failure_cases, failure_count, kimchi_premium, kimchi_as_of, computed_at,
       bands
FROM forecast.accumulation_band
ORDER BY asset, plan_week, computed_at DESC;
