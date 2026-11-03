-- roles.sql 되돌리기(관리자). 서비스 스키마가 **비어 있을 때만** 지운다 — 표가 있으면 DROP SCHEMA 가 실패해 멈춘다(CASCADE 를 쓰지 않는다).
-- forecast 스키마는 로컬 운영 DB 에 roles.sql 이전부터 있던 것이라 지우지 않는다(roles.sql 도 있으면 손대지 않는다).
--   psql -v ON_ERROR_STOP=1 -f db/roles-rollback.sql
DROP SCHEMA IF EXISTS ping;
SELECT format('DROP SCHEMA IF EXISTS %I', s)
  FROM unnest(ARRAY['identity','savings','household','content','market','portfolio','coach','notification']) AS s \gexec
SELECT 'DROP ROLE IF EXISTS svc_' || s
  FROM unnest(ARRAY['ping','identity','savings','household','content','market','portfolio','coach','notification']) AS s \gexec
-- svc_forecast 는 forecast 스키마를 새로 만든 곳(Compose · Testcontainers)에서만 주인이다 — 거기서는 스키마째 지운 뒤 지운다
SELECT 'DROP ROLE IF EXISTS svc_forecast'
 WHERE NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'forecast' AND pg_get_userbyid(nspowner) = 'svc_forecast') \gexec
