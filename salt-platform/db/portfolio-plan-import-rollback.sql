-- portfolio-plan-import.sql 되돌리기(서버 S4a 2026-11-26) — portfolio → public. **관리자가 돌린다.**
-- 쓰는 때: BFF `/plan` 을 legacy 로 되돌릴 때. 옛 표가 이미 drop 됐으면(Prisma `20261126100100`) 먼저 `20261119300100_plan_weekly` 의 CREATE 둘을 돌린다.
-- portfolio 에 쌓인 행을 public 에 덮어쓴다(같은 id 는 portfolio 값으로) · 시각은 UTC tz 없이(Prisma 모양)
BEGIN;

INSERT INTO public.plan_settings (id, user_id, monthly_base_krw, previous_monthly_base_krw, effective_week, started_week, created_at, updated_at)
SELECT id, user_id, monthly_base_krw, previous_monthly_base_krw, effective_week, started_week, created_at AT TIME ZONE 'UTC', updated_at AT TIME ZONE 'UTC'
  FROM portfolio.plan_settings
ON CONFLICT (id) DO UPDATE SET monthly_base_krw = EXCLUDED.monthly_base_krw, previous_monthly_base_krw = EXCLUDED.previous_monthly_base_krw,
  effective_week = EXCLUDED.effective_week, updated_at = EXCLUDED.updated_at;

INSERT INTO public.weekly_plan_executions (id, user_id, week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed, blocked_reason,
                                           prereg_key, indicator_value, fallback, status, executed_krw, recorded_at, created_at, updated_at)
SELECT id, user_id, week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed, blocked_reason,
       prereg_key, indicator_value, fallback, status, executed_krw, recorded_at AT TIME ZONE 'UTC', created_at AT TIME ZONE 'UTC', updated_at AT TIME ZONE 'UTC'
  FROM portfolio.weekly_plan_executions
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, executed_krw = EXCLUDED.executed_krw, recorded_at = EXCLUDED.recorded_at, updated_at = EXCLUDED.updated_at;

COMMIT;
