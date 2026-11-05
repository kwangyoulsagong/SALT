#!/bin/sh
# Compose Postgres 첫 기동 때 한 번(/docker-entrypoint-initdb.d). 비밀은 환경 변수로만 — 파일에 0.
set -eu
: "${PING_DB_PASSWORD:?PING_DB_PASSWORD 가 없다 (.env)}"
: "${SAVINGS_DB_PASSWORD:?SAVINGS_DB_PASSWORD 가 없다 (.env)}"
: "${HOUSEHOLD_DB_PASSWORD:?HOUSEHOLD_DB_PASSWORD 가 없다 (.env)}"
: "${CONTENT_DB_PASSWORD:?CONTENT_DB_PASSWORD 가 없다 (.env)}"
: "${NOTIFICATION_DB_PASSWORD:?NOTIFICATION_DB_PASSWORD 가 없다 (.env)}"
: "${COACH_DB_PASSWORD:?COACH_DB_PASSWORD 가 없다 (.env)}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v ping_password="$PING_DB_PASSWORD" -v savings_password="$SAVINGS_DB_PASSWORD" \
  -v household_password="$HOUSEHOLD_DB_PASSWORD" -v content_password="$CONTENT_DB_PASSWORD" \
  -v notification_password="$NOTIFICATION_DB_PASSWORD" -v coach_password="$COACH_DB_PASSWORD" -f /salt/roles.sql
