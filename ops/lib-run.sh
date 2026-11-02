#!/bin/zsh
# launchd 실행 스크립트 공용 — `salt-server/ops/run-server.sh` · `run-news.sh` · `bff/ops/run.sh` 가 source 한다(`OPS-002`).
#
# 왜: 2026-11-02 `launchctl kickstart -k` 뒤 감싸는 zsh 만 죽고 그 아래 `tsx → node` 가 고아로 남아 포트 4000 을 쥐었다 —
# 새 서버는 EADDRINUSE 로 30초마다 죽고 다시 떴다(그전 기록 "옛 프로세스가 포트를 늦게 놓는다"는 실제로는 "아예 안 놓는다"였다).
#
# - run_supervised <로그 이름> <명령…> : 명령 | rotatelogs 를 뒤에서 돌리고 기다린다. TERM · INT · HUP 이면 프로세스 그룹 전체를 내린다
# - stop_stale <진입 파일> : 같은 작업 폴더에서 이 진입 파일로 떠 있는 옛 프로세스(이 그룹 밖)를 TERM → 5초 → KILL.
#   조각은 진입 파일 경로만 — tsx 가 띄운 실제 node 는 명령줄이 `node --require …/preflight.cjs … src/server.ts` 라
#   `tsx src/server.ts` 로는 안 걸린다(2026-11-02 첫 판이 그래서 고아를 못 지웠다)

stop_stale() {
  local pattern=$1 here=$PWD pid cwd
  for pid in $(pgrep -f -- "$pattern"); do
    [[ $(ps -o pgid= -p $pid | tr -d ' ') == $$ ]] && continue
    cwd=$(lsof -a -p $pid -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
    [[ $cwd == $here ]] || continue
    print -r -- "[$(date '+%F %T')] 옛 프로세스 정리: $pid ($pattern)"
    kill -TERM $pid 2>/dev/null
  done
  # 옛 프로세스가 없으면 기다리지 않는다
  pgrep -f -- "$pattern" >/dev/null || return 0
  sleep 5
  for pid in $(pgrep -f -- "$pattern"); do
    [[ $(ps -o pgid= -p $pid | tr -d ' ') == $$ ]] && continue
    cwd=$(lsof -a -p $pid -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
    [[ $cwd == $here ]] && kill -KILL $pid 2>/dev/null
  done
  return 0
}

# 포트가 빌 때까지 최대 15초 — 옛 프로세스가 정상 종료(DB 연결 닫기) 중이면 1~2초 포트를 쥔다. 기다리지 않으면 새 프로세스가
# EADDRINUSE 로 죽고 launchd 재시도 간격(30초)만큼 늦게 뜬다(2026-11-02 실측 — 재시작 한 번에 30초+)
wait_port_free() {
  local port=$1 i
  for i in {1..30}; do
    lsof -nP -tiTCP:$port -sTCP:LISTEN >/dev/null 2>&1 || return 0
    sleep 0.5
  done
  print -r -- "[$(date '+%F %T')] 포트 $port 가 15초 뒤에도 차 있다 — 그대로 시작(실패하면 launchd 가 다시 띄운다)"
}

run_supervised() {
  local log=$1; shift
  trap 'trap - TERM INT HUP; kill -TERM -- -$$ 2>/dev/null; exit 143' TERM INT HUP
  "$@" 2>&1 | /usr/sbin/rotatelogs -n 5 "$HOME/Library/Logs/$log.log" 20M &
  wait
}
