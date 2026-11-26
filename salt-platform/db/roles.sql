-- 서비스별 스키마 · DB 계정(`DB-REQ-036` FR-1). **관리자(DB 소유자)가 돌린다.** 다시 돌려도 같은 결과다.
--
--   psql -v ON_ERROR_STOP=1 -v ping_password="$PING_DB_PASSWORD" -v savings_password="$SAVINGS_DB_PASSWORD" \
--        -v household_password="$HOUSEHOLD_DB_PASSWORD" -v content_password="$CONTENT_DB_PASSWORD" \
--        -v notification_password="$NOTIFICATION_DB_PASSWORD" -v coach_password="$COACH_DB_PASSWORD" \
--        -v identity_password="$IDENTITY_DB_PASSWORD" -v portfolio_password="$PORTFOLIO_DB_PASSWORD" -f db/roles.sql
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

-- S1(`SRV-REQ-045`, 2026-11-03) — savings 가 플랫폼으로 옮겨 와 로그인을 연다. 스키마 · 계정은 위 도메인 줄이 이미 만들었다
ALTER ROLE svc_savings LOGIN PASSWORD :'savings_password';

-- 가계부 S1a(`SRV-REQ-046`, 2026-11-04) — household 가 플랫폼에서 태어나 로그인을 연다. 스키마 · 계정은 위 도메인 줄이 이미 만들었다
ALTER ROLE svc_household LOGIN PASSWORD :'household_password';

-- 금융 팁 S2a(`SRV-REQ-047`, 2026-11-05) — content 가 플랫폼에서 태어나 로그인을 연다. 스키마 · 계정은 위 도메인 줄이 이미 만들었다
ALTER ROLE svc_content LOGIN PASSWORD :'content_password';

-- 서버 S2c(`SRV-REQ-048` FR-5, 2026-11-06) — notification 이 플랫폼으로 옮겨 와 로그인을 연다. coach 는 아웃박스(발행 창구)만 플랫폼이 릴레이한다 —
-- 업무 표는 S6 까지 Express(public). Express 는 DB 소유자 계정으로 coach.outbox 에 행을 쓴다
ALTER ROLE svc_notification LOGIN PASSWORD :'notification_password';
ALTER ROLE svc_coach LOGIN PASSWORD :'coach_password';

-- 서버 S3a(`SRV-REQ-048` FR-1 · 2, 2026-11-06) — identity 가 플랫폼에서 셸 설정 표로 태어나 로그인을 연다. 사용자 · 초대 코드 표는 S3b 까지 public(Express auth)
ALTER ROLE svc_identity LOGIN PASSWORD :'identity_password';

-- 서버 S4a(`SRV-REQ-049` FR-1, 2026-11-26) — portfolio 가 밴드 적립(plan)으로 플랫폼에 옮겨 와 로그인을 연다. 보유 · 거래 표는 S4b 까지 public(Express).
-- 예측 밴드 뷰 둘 SELECT 는 forecast DDL 주인(Prisma `20261126100000_forecast_band_grant_portfolio`)이 준다 — 여기서 주지 않는다(주인 한 곳)
ALTER ROLE svc_portfolio LOGIN PASSWORD :'portfolio_password';
