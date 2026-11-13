#!/bin/zsh
# 패널 칸 채움 점검 결함 주입 시험(OPS-004 수용 기준) — 회차 하나를 트랜잭션 안에서 만들고 · 점검 쿼리를 돌리고 · 되돌린다(ROLLBACK).
# 실 DB 를 바꾸지 않는다. 기준선(마지막 실측 그대로)이 ok 여야 각 주입의 ✗ 가 그 결함 때문이라고 말할 수 있다.
set -u
ROOT=${0:A:h:h}
url=$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"?]*\).*/\1/p' "$ROOT/salt-server/.env" | head -1)
fail=0

run() { # $1 이름  $2 주입 SQL  $3 줄 이름  $4 칸(3 코인 · 4 국내)  $5 기대 앞머리
  local out
  out=$(psql "$url" -At -F '|' -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN;
$2
\i $ROOT/ops/panel-cells.sql
ROLLBACK;
SQL
)
  local cell; cell=$(print -r -- "$out" | grep -E "^[0-9]+\|$3\|" | cut -d'|' -f"$4")
  if [[ $cell == $5* ]]; then print "  통과  $1 — $cell"; else print "  실패  $1 — 기대 '$5' · 실제 '${cell:-없음}'"; fail=1; fi
}

# 마지막 회차를 그대로 새 시각으로 복사하고(주입의 바탕) 한 칸만 바꾼다
COPY="insert into panel_cell_check (id, run_at, market, symbol, cell_key, tier, stale, new_symbol)
      select gen_random_uuid()::text, now() at time zone 'utc', market, symbol, cell_key, tier, stale, new_symbol
        from panel_cell_check where run_at = (select max(run_at) from panel_cell_check);"
LAST="(select max(run_at) from panel_cell_check)"
ONE="(select symbol from panel_cell_check where run_at = $LAST and market = 'crypto' order by symbol limit 1)"

run "기준선 코인 원인"     "select 1;" "원인 근거 결과" 3 "ok"
run "기준선 국내 점검"     "select 1;" "점검 한 줄" 4 "ok"
run "코인 한 종목 원인 결함" "$COPY update panel_cell_check set tier = 'defect' where run_at = $LAST and cell_key = 'cause' and symbol = $ONE;" "원인 근거 결과" 3 "✗"
run "국내 시나리오 1일 결함" "$COPY update panel_cell_check set tier = 'defect' where run_at = $LAST and cell_key = 'scenario.1d' and market = 'kr';" "시나리오 1일" 4 "✗"
run "멈춘 종목"            "$COPY update panel_cell_check set stale = true where run_at = $LAST and symbol = $ONE;" "멈춘 종목" 3 "✗"
run "새 종목 빈 칸"        "$COPY update panel_cell_check set new_symbol = true, tier = case when cell_key = 'verdict' then 'defect' else tier end where run_at = $LAST and symbol = $ONE;" "새 종목 빈 칸" 3 "✗"
run "실측 없음"            "delete from panel_cell_check;" "마지막 실측" 3 "없음"
run "26시간 넘게 안 돎"     "update panel_cell_check set run_at = run_at - interval '2 days';" "마지막 실측" 4 "✗"
run "되돌린 뒤 코인 원인"   "select 1;" "원인 근거 결과" 3 "ok"
exit $fail
