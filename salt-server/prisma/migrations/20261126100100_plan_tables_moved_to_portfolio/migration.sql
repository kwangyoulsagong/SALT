-- SRV-REQ-049 FR-1 · DB-REQ-036 부록 portfolio(2026-11-26, 서버 S4a) — 밴드 적립 표 둘의 주인이 Kotlin portfolio(Flyway `portfolio.V1__baseline`)로 옮겨 갔다.
-- 순서: ① salt-platform/db/portfolio-plan-import.sql(관리자 — public → portfolio 복사 · 행 수 대조) ② 이 마이그레이션(옛 표 drop).
-- drop 전 덤프: pg_dump -Fc -t public.plan_settings -t public.weekly_plan_executions(경로는 커밋 · 체크리스트에). 옮길 때 행 0 · 0(2026-11-26 실측).
-- 롤백: 20261119300100_plan_weekly 의 CREATE 문 두 개를 다시 돌린 뒤 salt-platform/db/portfolio-plan-import-rollback.sql(portfolio → public).
DROP TABLE "weekly_plan_executions";
DROP TABLE "plan_settings";
