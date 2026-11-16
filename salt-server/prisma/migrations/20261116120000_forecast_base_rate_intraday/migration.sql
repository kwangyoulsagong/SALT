-- F017 v4 순서 3 (2026-11-16) — 장중 기저율 1시간 · 4시간. DB-REQ-043 FR-3 개정 · FC-REQ-028 FR-7.
-- 추가만. 롤백 = 아래 뷰를 20261111120000 정의로 되돌리고 ALTER TABLE forecast.base_rate_stat DROP COLUMN horizon_unit.
-- 쓰기는 salt-forecast 만, 서버(coach)는 뷰만 읽는다(db-contract.md §1 · §2).
--
-- 사전등록 `base-rate@2`(salt-forecast/preregistration/2026-11-16-base-rate-intraday.toml) 행은 horizon 이 **시간**이다.
-- 같은 표에 두되 단위를 열로 둔다 — 키가 prereg_key 로 갈리지만, 서버가 키를 잘못 읽어도 1시간을 1일로 읽지 않게.

ALTER TABLE forecast.base_rate_stat
  ADD COLUMN horizon_unit text NOT NULL DEFAULT 'day' CHECK (horizon_unit IN ('day', 'hour'));

-- 열은 끝에만 붙인다(CREATE OR REPLACE VIEW 는 기존 열 순서를 바꿀 수 없다)
CREATE OR REPLACE VIEW forecast.v_base_rate AS
SELECT DISTINCT ON (prereg_key, market, condition_id, horizon)
  prereg_key, market, condition_id, horizon, as_of, kind, status,
  sample, sample_eff, sample_days,
  up_rate, up_rate_shrunk, up_low, up_high, mean, q10, q50, q90,
  hold_up_rate, hold_q10, hold_q50, hold_q90,
  differs, recent_differs, window_start, window_end,
  horizon_unit
FROM forecast.base_rate_stat
ORDER BY prereg_key, market, condition_id, horizon, as_of DESC;
