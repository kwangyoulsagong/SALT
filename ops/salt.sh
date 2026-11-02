#!/bin/zsh
# SALT 로컬 전체 기동 · 상태 · 중지 — 명령 하나로(`OPS-002`). 배포 환경이 없어서 이 맥이 서버다(`OPS-001` 전까지).
#
#   ops/salt.sh up              전부 켠다(상시 프로세스는 launchd 에 등록 — 재부팅해도 다시 뜬다) + 웹 dev
#   ops/salt.sh up --replace    포트를 잡고 있는 수동 SALT 프로세스(예: `npm run dev` 로 띄운 BFF)를 내리고 launchd 로 바꾼다
#   ops/salt.sh status          무엇이 떠 있고 무엇이 빠졌나 · 헬스 · 마지막 뉴스 · 시세 갱신 시각
#   ops/salt.sh down [이름]      내린다(이름 없으면 전부 — 상시 서버 포함)
#   ops/salt.sh restart <이름>   코드를 바꾼 뒤 재시작(launchd 는 watch 없이 뜬다)
#   ops/salt.sh logs <이름>      로그 꼬리
#   ops/salt.sh plist <이름>     up 이 등록할 launchd plist 를 등록 없이 출력(검토용)
#
# 왜 이 스크립트인가: 프로세스가 7개(서버 · 뉴스 워커 · BFF REST · WS · 시세 워커 · 예측 배치 · 웹)인데 서버와 예측만 상시였고
# 나머지는 사람이 기억해서 띄웠다. 2026-11-02 뉴스 워커가 09-29 부터 · BFF 시세 워커도 꺼진 채 발견 — 사용자 "계속 머 까먹어서".
# 데이터를 모으는 프로세스(뉴스 · 시세)는 전부 상시로 둔다. 웹 dev 만 상시가 아니다(빌드 · 재시작이 잦다).
#
# 이름: server · news · bff-rest · bff-ws · bff-worker · forecast · web · web-investment
# 웹 dev 는 zone 마다 하나(셸 web 3000 · 투자 web-investment 3002 — `FE-REQ-053`). 셸이 투자 경로를 3002 로 프록시한다
set -u
ROOT="${0:A:h:h}"
UID_NUM="$(id -u)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs"
NODE_DIR="$(dirname "$(command -v node 2>/dev/null || echo /usr/local/bin/node)")"
# ~/.local/bin — Claude Code CLI 설치 위치. 서버가 해설 다듬기 로컬 CLI 를 PATH 에서 찾는다(`SRV-REQ-050` FR-2).
# 없으면 nvm 경로의 codex 만 잡히거나 전부 Gemini 로 간다
LAUNCH_PATH="$NODE_DIR:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# 이름 → launchd 라벨 · 실행 스크립트 · 포트(없으면 -) · 헬스 주소(없으면 -) · 로그
typeset -A LABEL SCRIPT PORT HEALTH LOG
LABEL=(server com.salt.server news com.salt.news bff-rest com.salt.bff-rest bff-ws com.salt.bff-ws bff-worker com.salt.bff-worker forecast com.salt.forecast-daily)
SCRIPT=(server "$ROOT/salt-server/ops/run-server.sh" news "$ROOT/salt-server/ops/run-news.sh"
        bff-rest "$ROOT/bff/ops/run.sh rest" bff-ws "$ROOT/bff/ops/run.sh ws" bff-worker "$ROOT/bff/ops/run.sh worker"
        forecast "$ROOT/salt-forecast/ops/daily.sh")
PORT=(server 4000 news - bff-rest 4001 bff-ws 4002 bff-worker - forecast - web 3000 web-investment 3002)
HEALTH=(server http://localhost:4000/health bff-rest http://localhost:4001/health)
LOG=(server "$LOGS/salt-server.log" news "$LOGS/salt-news.log" bff-rest "$LOGS/salt-bff-rest.log" bff-ws "$LOGS/salt-bff-ws.log"
     bff-worker "$LOGS/salt-bff-worker.log" forecast "$LOGS/salt-forecast-daily.log" web "$LOGS/salt-web.log"
     web-investment "$LOGS/salt-web-investment.log")
# 포트 없는 상시 프로세스를 수동으로 띄웠는지 알아보는 명령줄 조각
typeset -A PATTERN
PATTERN=(news "workers/news-crawler.worker" bff-worker "workers/price-updater.worker")
ORDER=(server news bff-rest bff-ws bff-worker forecast web web-investment)
# launchd 가 아니라 pnpm dev 로 띄우는 zone 앱(이름 = pnpm 필터)
DEV_APPS=(web web-investment)
is_dev() { (( ${DEV_APPS[(Ie)$1]} )); }
SERVICES=(server news bff-rest bff-ws bff-worker forecast)

say() { print -r -- "$*"; }

plist_of() { print -r -- "$AGENTS/${LABEL[$1]}.plist"; }

# launchd plist 를 만든다. 예측 배치는 매시(StartInterval) · 나머지는 KeepAlive
write_plist() {
  local name=$1 label=${LABEL[$1]} out
  out=${2:-$(plist_of "$name")}
  local args="" part
  for part in /bin/zsh ${(z)SCRIPT[$name]}; do args+="    <string>$part</string>"$'\n'; done
  local schedule
  if [[ $name == forecast ]]; then
    schedule="  <key>StartInterval</key><integer>3600</integer>"
  else
    schedule="  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>"
  fi
  local stdlog="$LOGS/$label.launchd.log"
  [[ $name == server ]] && stdlog="$LOGS/salt-server.launchd.log"
  [[ $name == forecast ]] && stdlog="$LOGS/salt-forecast-daily.log"
  cat > "$out" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- ops/salt.sh 가 만든다 — 손으로 고치지 말고 스크립트를 고친다 -->
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
$args  </array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$LAUNCH_PATH</string></dict>
  <key>RunAtLoad</key><true/>
$schedule
  <key>StandardOutPath</key><string>$stdlog</string>
  <key>StandardErrorPath</key><string>$stdlog</string>
</dict>
</plist>
EOF
}

loaded() { launchctl print "gui/$UID_NUM/${LABEL[$1]}" >/dev/null 2>&1; }
agent_pid() { launchctl print "gui/$UID_NUM/${LABEL[$1]}" 2>/dev/null | awk '/^\tpid = /{print $3; exit}'; }
port_pid() { lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -1; }
cmd_of() { ps -p "$1" -o command= 2>/dev/null; }
# 포트 · 패턴으로 찾은 프로세스가 이 저장소 것인가
is_salt() { [[ "$(cmd_of "$1")" == *"$ROOT"* ]] || [[ "$(lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" == "$ROOT"* ]]; }
manual_pid() {
  local name=$1 p
  if [[ ${PORT[$name]} != - ]]; then p=$(port_pid ${PORT[$name]}); else p=$(pgrep -f "${PATTERN[$name]:-__none__}" | head -1); fi
  [[ -n $p ]] && print -r -- "$p"
}

start_service() {
  local name=$1 replace=$2
  if loaded "$name"; then
    say "  ✓ $name — 이미 launchd 에 있다"
    return
  fi
  local holder; holder=$(manual_pid "$name")
  if [[ -n $holder ]]; then
    if ! is_salt "$holder"; then
      say "  ✗ $name — 포트 ${PORT[$name]} 를 다른 프로젝트가 쓴다(PID $holder: $(cmd_of "$holder" | cut -c1-80)). 건너뜀"
      return
    fi
    if [[ $replace != 1 ]]; then
      say "  • $name — 수동으로 떠 있다(PID $holder). 그대로 둔다 — launchd 로 바꾸려면 'up --replace'"
      return
    fi
    say "  ↻ $name — 수동 프로세스(PID $holder)를 내리고 launchd 로"
    pkill -P "$holder" 2>/dev/null; kill "$holder" 2>/dev/null
    # tsx watch 는 부모 · 자식 둘이다 — 같은 명령줄을 다 내린다
    [[ -n ${PATTERN[$name]:-} ]] && pkill -f "${PATTERN[$name]}" 2>/dev/null
    sleep 2
  fi
  write_plist "$name"
  launchctl bootstrap "gui/$UID_NUM" "$(plist_of "$name")" 2>/dev/null || launchctl load "$(plist_of "$name")"
  say "  ▲ $name — launchd 에 올렸다(${LABEL[$name]})"
}

start_dev() {
  local name=$1 port=${PORT[$1]} holder; holder=$(port_pid "$port")
  if [[ -n $holder ]]; then
    if is_salt "$holder"; then say "  ✓ $name — 떠 있다(PID $holder)"; else say "  ✗ $name — $port 을 다른 프로젝트가 쓴다(PID $holder). 건너뜀"; fi
    return
  fi
  (cd "$ROOT/salt-microFe" && nohup pnpm --filter "$name" dev >"${LOG[$name]}" 2>&1 &)
  say "  ▲ $name — pnpm --filter $name dev ($port, 로그 ${LOG[$name]})"
}

latest() {
  # 데이터 신선도 — 이것이 "프로세스는 떠 있는데 안 모은다"를 잡는다
  local url; url=$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"?]*\).*/\1/p' "$ROOT/salt-server/.env" 2>/dev/null | head -1)
  [[ -z $url ]] && { say "  (DB 주소 없음 — salt-server/.env)"; return; }
  # 기준을 넘으면 ✗ — 뉴스는 매시 수집(3시간), 코인 시세는 서버 워커가 분 단위로 갱신(10분)
  psql "$url" -At -F '|' -c "
    select '뉴스 마지막 수집', to_char(max(created_at) + interval '9 hours','MM-DD HH24:MI'),
           round(extract(epoch from now() at time zone 'utc' - max(created_at))/3600) || '시간 전',
           case when max(created_at) < now() at time zone 'utc' - interval '3 hours' then '✗' else 'ok' end
      from news_articles
    union all
    select '코인 시세 마지막 갱신', to_char(max(price_updated_at) + interval '9 hours','MM-DD HH24:MI'),
           round(extract(epoch from now() at time zone 'utc' - max(price_updated_at))/60) || '분 전',
           case when max(price_updated_at) < now() at time zone 'utc' - interval '10 minutes' then '✗' else 'ok' end
      from market_assets where asset_type = 'crypto'
  " 2>/dev/null | while IFS='|' read -r label at ago mark; do printf "  %-2s %s %s (%s)\n" "$mark" "$label" "$at" "$ago"; done || say "  (DB 조회 실패)"
}

status() {
  say "SALT 상태 — $(date '+%m-%d %H:%M')"
  printf "  %-15s %-8s %-8s %-6s %s\n" 이름 방식 PID 포트 헬스
  local name pid how port h
  for name in $ORDER; do
    port=${PORT[$name]}; h=""
    if is_dev "$name"; then
      pid=$(port_pid "$port"); how=dev
      [[ -n $pid ]] && ! is_salt "$pid" && { how=남의것; }
    elif loaded "$name"; then
      pid=$(agent_pid "$name"); how=launchd
      [[ -z $pid && $name == forecast ]] && pid="(매시)"
    else
      pid=$(manual_pid "$name"); how=수동
      [[ -n $pid ]] && ! is_salt "$pid" && how=남의것
    fi
    [[ -z $pid ]] && { how="—"; pid="꺼짐"; }
    if [[ -n ${HEALTH[$name]:-} ]]; then
      h=$(curl -s -o /dev/null -m 3 -w '%{http_code}' "${HEALTH[$name]}" 2>/dev/null); [[ $h == 200 ]] && h="ok" || h="✗ ${h:-응답 없음}"
    fi
    printf "  %-15s %-8s %-8s %-6s %s\n" "$name" "$how" "$pid" "$port" "$h"
  done
  pg_isready -q -h localhost -p 5432 && say "  postgres    ok" || say "  postgres    ✗ 꺼짐 — brew services start postgresql"
  latest
}

down_one() {
  local name=$1
  if is_dev "$name"; then
    local p; p=$(port_pid "${PORT[$name]}")
    if [[ -n $p ]] && is_salt "$p"; then pkill -P "$p" 2>/dev/null; kill "$p"; say "  ▼ $name"; else say "  · $name — 안 떠 있다"; fi
    return
  fi
  if loaded "$name"; then
    launchctl bootout "gui/$UID_NUM/${LABEL[$name]}" 2>/dev/null || launchctl unload "$(plist_of "$name")"
    say "  ▼ $name — launchd 에서 내렸다(다음 'up' 때 다시 올라간다)"
  else
    say "  · $name — launchd 에 없다"
  fi
}

valid() { (( ${ORDER[(Ie)$1]} )) || { say "모르는 이름: $1 — ${ORDER[*]}"; exit 2; }; }

case "${1:-status}" in
  up)
    replace=0; [[ "${2:-}" == --replace ]] && replace=1
    pg_isready -q -h localhost -p 5432 || say "  ! postgres 가 꺼져 있다 — brew services start postgresql 먼저"
    say "켜기"
    for name in $SERVICES; do start_service "$name" "$replace"; done
    for name in $DEV_APPS; do start_dev "$name"; done
    sleep 4
    status ;;
  status) status ;;
  down)
    if [[ -n "${2:-}" ]]; then valid "$2"; down_one "$2"; else for name in ${(Oa)ORDER}; do down_one "$name"; done; fi ;;
  restart)
    valid "${2:-}"
    if is_dev "$2"; then down_one "$2"; sleep 1; start_dev "$2"
    elif loaded "$2"; then
      # kickstart -k 를 쓰지 않는다 — 옛 node 가 종료(DB 연결 닫기) 중일 때 새 프로세스가 떠 EADDRINUSE 로 죽고,
      # launchd 가 재시도를 미뤄 1~2분 꺼져 있었다(2026-11-02 실측). 내리고 · 비기를 확인하고 · 올린다
      down_one "$2" >/dev/null
      for _ in {1..40}; do
        [[ -z "$(manual_pid "$2")" ]] && break
        sleep 0.5
      done
      [[ -n "$(manual_pid "$2")" ]] && say "  ! $2 — 20초 뒤에도 옛 프로세스가 남아 있다(PID $(manual_pid "$2")). 시작 스크립트가 정리한다"
      # 교체 모드(1) — 옛 프로세스가 남았으면 내리고 올린다. 0 이면 "수동으로 떠 있다"로 보고 등록을 건너뛰어 launchd 에서 빠졌다(2026-11-02)
      start_service "$2" 1 >/dev/null && say "  ↻ $2"
    else say "  $2 — launchd 에 없다. 'ops/salt.sh up' 먼저"; fi ;;
  logs)
    valid "${2:-}"; tail -n 50 -f "${LOG[$2]}" ;;
  plist)
    valid "${2:-}"; is_dev "$2" && { say "$2 은 launchd 가 아니다(dev)"; exit 2; }
    write_plist "$2" /dev/stdout ;;
  -h|--help|help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) say "모르는 명령: $1 — up | status | down | restart | logs | plist"; exit 2 ;;
esac
