#!/bin/zsh
# 매시 — 과거 빈 구간 메우기와 데이터가 찬 뒤 한 번 도는 백테스트(launchd forecast-backfill, OPS-002 · 2026-11-16).
#
# 왜: 1회 백필을 Claude 세션 셸에서 띄웠더니 세션이 끝날 때 같이 죽었다(2026-11-16 14:29 — 5분봉 296종목 중 19종목만,
# FRED 대기 · 국내 감시 스크립트도). launchd 가 매시 부르면 잠자기 · 재부팅 · 실패 뒤 다음 실행이 받은 곳부터 잇는다.
# launchd 는 같은 라벨을 겹쳐 띄우지 않는다 — 첫 실행이 10시간이어도 그동안 다음 실행은 생기지 않는다.
# 다 차 있으면 요청 0건 · 몇 초로 끝난다(ingest_prices 가 상장일까지 찬 종목을 건너뛴다).
set -u
cd "$(dirname "$0")/.." || exit 1
# 실행 트리 동기화(ops/sync-run.sh) 중이면 끝날 때까지 기다린다 — 최대 2분. 개발 트리엔 이 파일이 없다
for _ in {1..24}; do [[ -e ../.salt-sync.lock ]] || break; sleep 5; done
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"
ts() { date -u +%FT%TZ; }
rc=0

# 1) 업비트 5분봉 2024-11~ — 장중 기저율(base-rate@3) 통계가 2년을 본다. 처음 한 번 약 10시간.
#    그동안 intraday.sh 증분은 같은 락에 "이미 실행 중"으로 건너뛴다 — 끝난 뒤 첫 증분이 종목별 마지막 봉부터 이어 받는다
"$UV" run --frozen python -m salt_forecast.jobs.ingest_prices --interval 5m --since 2024-11-01 --days 0 \
  || { echo "[$(ts)] 업비트 5분봉 빈 곳 메우기 실패 — 다음 시에 잇는다"; rc=1; }

# 2) 큰 움직임 × 소식(move-news@3) 늦은 사건 — 맥이 잠든 날의 사건은 깨어난 지 2시간 뒤에 기록한다(작업이 판단).
#    매일 배치는 깨자마자 돌아 늘 2시간 전이라, 매시 여기서 한 번 더 부른다. 기록할 게 없으면 약 10초
"$UV" run --frozen python -m salt_forecast.jobs.move_news --no-report >/dev/null \
  || { echo "[$(ts)] move_news 늦은 사건 기록 실패 — 다음 시에"; rc=1; }

# 3) 국내 백테스트 — 서버 밤 전 종목 일봉 5년(여러 밤)이 다 받은 뒤 한 번. 빈 데이터로 돌면 틀린 성적이 원장에 들어간다.
#    조건: 마지막 전 종목 회차가 "남음 0"(07:20 멈춤 아님) · 국내 일봉 2,000종목 이상 · 국내 판단 과거 검산 행이 아직 없음.
#    base_rate · short_direction · events 는 daily.sh 가 매일 다시 돈다 — 여기는 매일 돌지 않는 셋만
kr_backtest_ready() {
  local line n done_rows
  line=$(grep -h "전 종목 일봉:" ~/Library/Logs/salt-server.log* 2>/dev/null | sort | tail -1)
  [[ $line == *"남음 0"* && $line != *"멈춤"* ]] || return 1
  n=$(psql salt_db -Atc "select count(distinct symbol) from price_history where asset_type='kr_stock' and timeframe='1d'") || return 1
  (( n >= 2000 )) || return 1
  done_rows=$(psql salt_db -Atc "select count(*) from symbol_judgment_snapshots where sample_origin like 'backtest%' and symbol ~ '^[0-9]{6}$'") || return 1
  (( done_rows == 0 ))
}
if kr_backtest_ready; then
  echo "[$(ts)] 국내 백테스트 시작 — 전 종목 일봉이 다 찼다"
  for job in ingest_kr_stock kr_backtest rule_ic_kr; do
    "$UV" run --frozen python -m "salt_forecast.jobs.${job}" || { echo "[$(ts)] ${job} 실패"; rc=1; }
  done
  # 판단 과거 검산을 원장에 — 성공하면 위 조건(행 없음)이 닫혀 다시 돌지 않는다. 실패하면 다음 시에 셋 다 다시
  (cd "${SALT_DEV_ROOT:-..}/salt-server" && npm run -s judgments:kr-backtest -- --write) || { echo "[$(ts)] judgments:kr-backtest 실패"; rc=1; }
fi
exit $rc
