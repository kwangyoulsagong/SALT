#!/bin/zsh
# 초대 코드 발급 — 관리 화면을 만들지 않는다(본인 + 최대 10명, `FEATURE-000` FR-23 "시드로 충분하다").
# 서버 S3b(2026-11-12)에 코드 표가 identity 로 옮겨 와 Express `scripts/issue-invite-codes.ts` 를 대신한다(같은 글자 · 길이 · 만료 규칙).
#
#   ops/issue-invite-codes.sh            # 3장, 30일 만료
#   ops/issue-invite-codes.sh 5 90       # 5장, 90일 만료
#
# 코드 원문은 **여기서만 보인다** — 다시 조회하는 경로가 없다(DB 접근이 곧 가입 권한이 되지 않게).
# svc_identity 로 붙는다(자기 스키마만). 비밀은 salt-platform/.env 의 LOCAL_DB_IDENTITY_PASSWORD
set -eu
setopt pipefail
cd "$(dirname "$0")/.." || exit 1
set -a; source ./.env; set +a

count=${1:-3}
days=${2:-30}
[[ $count == <1-> ]] || { echo "발급 장수는 1 이상의 정수여야 한다" >&2; exit 1; }
[[ $days == <1-> ]] || { echo "만료 일수는 1 이상의 정수여야 한다" >&2; exit 1; }

# 사람이 옮겨 적을 코드라 헷갈리는 글자(0 · O · 1 · I · L)를 뺀다. /dev/urandom 에서 고른다(암호학적 난수)
alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789'
# head 가 8자를 받고 닫으면 tr 이 SIGPIPE 로 끝난다 — 이 함수 안에서만 pipefail 을 끈다(아니면 set -e 가 스크립트를 141 로 멈춘다)
code() { setopt localoptions nopipefail; LC_ALL=C tr -dc "$alphabet" < /dev/urandom | head -c 8; }

export PGPASSWORD="$LOCAL_DB_IDENTITY_PASSWORD"
# 서비스 계정 기본 search_path 는 public — 플랫폼 연결처럼 identity 로(SQL 에 스키마를 적지 않는다)
export PGOPTIONS="-c search_path=identity"
psql_identity() { psql -h localhost -p 5432 -U svc_identity -d salt_db -v ON_ERROR_STOP=1 -Atq "$@"; }

issued=()
while (( ${#issued} < count )); do
  c=$(code)
  # 코드가 겹치면(유일 제약) 0행 — 다시 뽑는다
  inserted=$(psql_identity -c "INSERT INTO invite_codes (id, code, expires_at, created_at)
      VALUES (gen_random_uuid()::text, '$c', now() + interval '$days days', now()) ON CONFLICT (code) DO NOTHING RETURNING 1")
  [[ $inserted == 1 ]] && issued+=$c
done

expires=$(psql_identity -c "SELECT to_char((now() + interval '$days days') AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')")
used=$(psql_identity -c "SELECT count(*) FROM invite_codes WHERE used_by_user_id IS NOT NULL")
accounts=$(psql_identity -c "SELECT count(*) FROM users")
print "\n초대 코드 ${#issued}장 (만료 $expires)\n"
for c in $issued; print "  $c"
print "\n사용된 코드 ${used}장 · 현재 계정 ${accounts}명\n"
