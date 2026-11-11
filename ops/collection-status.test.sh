#!/bin/zsh
# 수집 점검 결함 주입 시험(OPS-003 수용 기준) — 결함 하나를 트랜잭션 안에서 만들고 · 점검 쿼리를 돌리고 · 되돌린다(ROLLBACK).
# 실 DB 를 바꾸지 않는다. 기준선(주입 없음)이 ok 여야 각 주입의 ✗ 가 그 결함 때문이라고 말할 수 있다.
set -u
ROOT=${0:A:h:h}
url=$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"?]*\).*/\1/p' "$ROOT/salt-server/.env" | head -1)
n=$(sed -n 's/^KIS_UNIVERSE_TOP_N=\([0-9]*\).*/\1/p' "$ROOT/salt-server/.env" | head -1); n=${n:-50}
fail=0

run() { # $1 이름  $2 주입 SQL  $3 기대 줄(정규식)  $4 칸(2 코인 · 3 국내)  $5 기대 표시(ok|✗)
  local out
  out=$(psql "$url" -At -F '|' -v kr_top_n="$n" -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN;
$2
\i $ROOT/ops/collection-status.sql
ROLLBACK;
SQL
)
  local cell; cell=$(print -r -- "$out" | grep -E "^$3\|" | cut -d'|' -f"$4")
  if [[ $cell == $5* ]]; then print "  통과  $1 — $cell"; else print "  실패  $1 — 기대 $5 · 실제 '${cell:-없음}'"; fail=1; fi
}

TOP="(select symbol from market_assets where asset_type='crypto' and is_active order by trade_value_24h desc nulls last limit 1)"
KR="(select code from kr_stock_master where group_code='ST' and delisted_at is null and is_preferred=false and market_cap is not null order by market_cap desc limit 1)"
DAY="(select date from market_holidays where market='KRX' and is_open and date < (now() at time zone 'Asia/Seoul')::date order by date desc limit 1)"

run "기준선 코인 구멍"   "select 1;" "5분봉 구멍" 2 ok
run "기준선 국내 구멍"   "select 1;" "5분봉 구멍" 3 ok
run "코인 위치 2시간 밀림" "update price_fill_mark set filled_through = now() - interval '2 hours' where symbol = $TOP;" "5분봉 구멍" 2 "✗"
run "코인 d1 지표 지움"   "delete from technical_indicators where timeframe='d1' and symbol = $TOP;" "지표 없음 · 묵음" 2 "✗"
run "국내 하루 5분봉 지움" "delete from price_history where timeframe='5m' and symbol = $KR and timestamp >= $DAY - interval '9 hours' and timestamp < $DAY + interval '15 hours';" "5분봉 구멍" 3 "✗"
run "국내 m5 지표 이틀 밀림" "delete from technical_indicators where timeframe='m5' and symbol = $KR and timestamp > now() at time zone 'utc' - interval '2 days';" "지표 없음 · 묵음" 3 "✗"
run "되돌린 뒤 코인"      "select 1;" "지표 없음 · 묵음" 2 ok
exit $fail
