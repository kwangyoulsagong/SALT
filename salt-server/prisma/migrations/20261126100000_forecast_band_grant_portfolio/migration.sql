-- SRV-REQ-049 FR-1 · DB-REQ-036 FR-1(2026-11-26, 서버 S4a — 밴드 적립 plan 을 Kotlin portfolio 로). 권한만 — 표 · 뷰 무변경.
-- portfolio 서비스 계정이 밴드 적립 예측 뷰 둘만 읽는다(`msa-services.md` §5 · `db-contract.md` §2 — 표가 아니라 뷰). 첫 예 savings(20261118100000).
-- 계정이 없는 DB(서비스 계정을 아직 안 만든 개발 DB)에서는 건너뛴다 — 계정은 `salt-platform/db/roles.sql` 이 만든다.
-- 주의: 뷰를 DROP · CREATE 로 다시 만들면 권한이 사라진다 — 이 두 뷰를 바꾸는 마이그레이션은 CREATE OR REPLACE 로(권한 유지) 또는 이 GRANT 를 다시.
-- 롤백: REVOKE SELECT ON forecast.v_accumulation_band, forecast.v_accumulation_band_week FROM svc_portfolio; REVOKE USAGE ON SCHEMA forecast FROM svc_portfolio;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_portfolio') THEN
    GRANT USAGE ON SCHEMA forecast TO svc_portfolio;
    GRANT SELECT ON forecast.v_accumulation_band, forecast.v_accumulation_band_week TO svc_portfolio;
  END IF;
END $$;
