#!/bin/zsh
# ops/kr-backtest-done.sql 시험(OPS-002) — 국내 백테스트 게이트가 "국내 장기 과거 검산 행"만 세는지 경계 표로 센다.
# 진짜 Postgres 에 세션 임시 표(pg_temp 가 public 을 가린다)를 만들어 실제 SQL 을 돌린다 — 원장은 건드리지 않는다.
# 11-16 ~ 11-25: 국내 단타 backtest_price_only 행이 게이트를 닫아 국내 백테스트가 한 번도 돌지 않았다.
set -u
SQL="${0:A:h}/kr-backtest-done.sql"
DB="${SALT_TEST_DB:-salt_db}"
fail=0
count() { # $1 = 넣을 행(sample_origin, signal_type, symbol) VALUES 목록, 빈 문자열이면 없음
  { print "create temp table symbol_judgment_snapshots (sample_origin text, signal_type text, symbol text);"
    [[ -n $1 ]] && print "insert into symbol_judgment_snapshots values $1;"
    print -r -- "\\i $SQL"; } | psql "$DB" -Atq -v ON_ERROR_STOP=1
}
check() { # $1 이름 · $2 기대(0 = 게이트 열림 · 1 = 닫힘) · $3 행
  local got; got=$(count "$3")
  if [[ $got == "$2" ]]; then print -r -- "ok   $1"; else print -r -- "FAIL $1 (기대 $2 · 실제 $got)"; fail=1; fi
}

# 열림 — 세지 않는 행
check "열림: 행 없음"                          0 ""
check "열림: 국내 단타 price_only(11-16 사고)"   0 "('backtest_price_only','kr_stock.scalp.wait','005930'),('backtest_price_only','kr_stock.scalp.avoid','000660')"
check "열림: 국내 장기 live"                    0 "('live','kr_stock.long_term.wait','005930')"
check "열림: 국내 장기 seen · synthetic"         0 "('backtest_seen','kr_stock.long_term.wait','005930'),('synthetic','kr_stock.long_term.avoid','005930')"
check "열림: 코인 장기 backtest_full"            0 "('backtest_full','crypto.long_term.wait','BTC')"
check "열림: LIKE 밑줄이 아무 글자로 새지 않음"     0 "('backtest_full','krXstock.longXterm.wait','005930')"
# 닫힘 — 판단 백테스트 스크립트가 쓰는(그리고 다시 쓰기 전 지우는) 행
check "닫힘: 국내 장기 backtest_full"            1 "('backtest_full','kr_stock.long_term.wait','005930')"
check "닫힘: 국내 장기 backtest(옛 이름)"         1 "('backtest','kr_stock.long_term.avoid','005930')"
check "닫힘: 단타 행과 섞여도 장기만 셈"          1 "('backtest_price_only','kr_stock.scalp.wait','005930'),('backtest_full','kr_stock.long_term.buy','000660')"
exit $fail
