#!/bin/zsh
# ops/signal-skill-stale.sql 시험(OPS-002) — 과거 검산 재실행 게이트가 그 스크립트가 쓰는 행의 나이만 보는지 경계 표로 센다.
# 진짜 Postgres 에 세션 임시 표(pg_temp 가 public 을 가린다)를 만들어 실제 SQL 을 돌린다 — 원장은 건드리지 않는다.
# 2026-11-26: 손으로만 돌려 열흘 묵은 과거 검산 때문에 코인 장기 3종 결함이 10 → 16.
set -u
SQL="${0:A:h}/signal-skill-stale.sql"
DB="${SALT_TEST_DB:-salt_db}"
fail=0
stale() { # $1 = 넣을 행(sample_origin, signal_type, created_at 앞으로 며칠) VALUES 목록, 빈 문자열이면 없음
  { print "create temp table symbol_judgment_snapshots (sample_origin text, signal_type text, created_at timestamp(3));"
    [[ -n $1 ]] && print "insert into symbol_judgment_snapshots select o, s, localtimestamp - make_interval(days => d) from (values $1) v(o, s, d);"
    print -r -- "\\i $SQL"; } | psql "$DB" -Atq -v ON_ERROR_STOP=1
}
check() { # $1 이름 · $2 기대(1 = 돈다 · 0 = 건너뜀) · $3 행
  local got; got=$(stale "$3")
  if [[ $got == "$2" ]]; then print -r -- "ok   $1"; else print -r -- "FAIL $1 (기대 $2 · 실제 $got)"; fail=1; fi
}

# 돈다
check "돈다: 행 없음"                                 1 ""
check "돈다: 코인 장기 8일 묵음"                       1 "('backtest_full','long_term.avoid',8)"
check "돈다: 국내 단타 8일 묵음"                       1 "('backtest_price_only','kr_stock.scalp.wait',8)"
check "돈다: 국내 장기 새 행은 세지 않음(다른 스크립트)"   1 "('backtest_full','long_term.wait',8),('backtest_full','kr_stock.long_term.wait',0)"
check "돈다: live · seen · synthetic 새 행은 세지 않음"  1 "('backtest_full','long_term.wait',8),('live','long_term.wait',0),('backtest_seen','long_term.wait',0),('synthetic','scalp.wait',0)"
# 건너뜀
check "건너뜀: 코인 단타 오늘"                         0 "('backtest_price_only','scalp.wait',0)"
check "건너뜀: 6일 — 7일 안"                          0 "('backtest_full','long_term.avoid',6)"
check "건너뜀: LIKE 밑줄이 아무 글자로 새지 않음(krX 는 국내가 아니라 범위 안)" 0 "('backtest_full','long_term.wait',8),('backtest_full','krXstock.long_term.wait',0)"
check "건너뜀: 묵은 행과 섞여도 가장 최근이 기준"         0 "('backtest_full','long_term.avoid',30),('backtest_price_only','kr_stock.scalp.avoid',1)"
exit $fail
