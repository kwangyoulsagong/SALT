-- 옛 public.plan_settings · public.weekly_plan_executions → portfolio 스키마 같은 이름 표(`SRV-REQ-049` FR-1 · `DB-REQ-036` 부록 portfolio, 서버 S4a 2026-11-26).
-- **관리자(DB 소유자)가 돌린다** — Flyway 는 svc_portfolio 로 돌아 public 을 읽을 권한이 없다.
--
--   psql -v ON_ERROR_STOP=1 -f db/portfolio-plan-import.sql
--
-- 순서: platform 이 한 번 떠서 Flyway V1 이 portfolio 표를 만든 뒤 → 이 스크립트 → BFF `/plan` → platform → Express 배포(옛 경로 · 표 drop).
-- - 열 · 값 그대로(id 포함). 시각: Prisma TIMESTAMP(3) 은 UTC 를 tz 없이 담는다 → UTC 로 읽는다
-- - INSERT 만 · 다시 돌려도 같은 결과(ON CONFLICT DO NOTHING)
-- - 끝에 대조: 표마다 옛 행 수 = 옮겨진 같은 id 수 · 금액 합 같음. 어긋나면 예외 → 전부 롤백
BEGIN;

INSERT INTO portfolio.plan_settings (id, user_id, monthly_base_krw, previous_monthly_base_krw, effective_week, started_week, created_at, updated_at)
SELECT id, user_id, monthly_base_krw, previous_monthly_base_krw, effective_week, started_week,
       created_at AT TIME ZONE 'UTC', updated_at AT TIME ZONE 'UTC'
  FROM public.plan_settings
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolio.weekly_plan_executions (id, user_id, week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed, blocked_reason,
                                              prereg_key, indicator_value, fallback, status, executed_krw, recorded_at, created_at, updated_at)
SELECT id, user_id, week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed, blocked_reason,
       prereg_key, indicator_value, fallback, status, executed_krw, recorded_at AT TIME ZONE 'UTC', created_at AT TIME ZONE 'UTC', updated_at AT TIME ZONE 'UTC'
  FROM public.weekly_plan_executions
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    s_old bigint; s_new bigint; e_old bigint; e_new bigint; a_old numeric; a_new numeric;
BEGIN
    SELECT count(*), coalesce(sum(monthly_base_krw), 0) INTO s_old, a_old FROM public.plan_settings;
    SELECT count(*), coalesce(sum(monthly_base_krw), 0) INTO s_new, a_new FROM portfolio.plan_settings WHERE id IN (SELECT id FROM public.plan_settings);
    IF s_old <> s_new OR a_old <> a_new THEN RAISE EXCEPTION '설정 대조 실패: 옛 %행 · 옮겨진 %행', s_old, s_new; END IF;
    SELECT count(*), coalesce(sum(planned_krw) + sum(coalesce(executed_krw, 0)), 0) INTO e_old, a_old FROM public.weekly_plan_executions;
    SELECT count(*), coalesce(sum(planned_krw) + sum(coalesce(executed_krw, 0)), 0) INTO e_new, a_new
      FROM portfolio.weekly_plan_executions WHERE id IN (SELECT id FROM public.weekly_plan_executions);
    IF e_old <> e_new OR a_old <> a_new THEN RAISE EXCEPTION '실행 기록 대조 실패: 옛 %행 · 옮겨진 %행', e_old, e_new; END IF;
    RAISE NOTICE '밴드 적립 대조 통과: 설정 %행 · 실행 기록 %행', s_new, e_new;
END $$;

COMMIT;
