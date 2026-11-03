-- 서비스별 스키마 · DB 계정(`DB-REQ-036` FR-1). **관리자(DB 소유자)가 돌린다.** 다시 돌려도 같은 결과다.
--
--   psql -v ON_ERROR_STOP=1 -v ping_password="$PING_DB_PASSWORD" -f db/roles.sql
--
-- - 스키마 주인 = 서비스 계정 → 자기 스키마에만 DDL(Flyway) · DML. 남의 스키마는 USAGE 가 없어 SELECT 도 권한 오류
-- - 아직 플랫폼에서 돌지 않는 서비스는 NOLOGIN — 그 서비스가 옮겨 오는 단계에 `ALTER ROLE … LOGIN PASSWORD` 한 줄
-- - 로컬 운영 DB(`salt` · public 42 테이블 + forecast)에는 S1 전에 돌리지 않는다. 지금은 Compose · Testcontainers 용

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 플랫폼에서 도는 서비스(S0: ping)
SELECT 'CREATE ROLE svc_ping' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_ping') \gexec
ALTER ROLE svc_ping LOGIN PASSWORD :'ping_password';
CREATE SCHEMA IF NOT EXISTS ping AUTHORIZATION svc_ping;
REVOKE ALL ON SCHEMA ping FROM PUBLIC;

-- 도메인 서비스 9(`ADR-006` §1) — 계정 · 스키마만. 로그인은 이전 단계에 연다
SELECT 'CREATE ROLE svc_' || s || ' NOLOGIN'
  FROM unnest(ARRAY['identity','savings','household','content','market','portfolio','coach','notification','forecast']) AS s
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_' || s) \gexec
SELECT format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', s, 'svc_' || s)
  FROM unnest(ARRAY['identity','savings','household','content','market','portfolio','coach','notification','forecast']) AS s \gexec
SELECT format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', s)
  FROM unnest(ARRAY['identity','savings','household','content','market','portfolio','coach','notification','forecast']) AS s \gexec
