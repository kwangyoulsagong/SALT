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
#   ops/salt.sh usage           도메인 사용 계측 — 최근 8주 주간 활성 · 재개율 · 카드 클릭(`ops/usage-weekly.sql`, 서버 S3d `SRV-REQ-048` FR-7)
#
# 왜 이 스크립트인가: 프로세스가 7개(서버 · 뉴스 워커 · BFF REST · WS · 시세 워커 · 예측 배치 · 웹)인데 서버와 예측만 상시였고
# 나머지는 사람이 기억해서 띄웠다. 2026-11-02 뉴스 워커가 09-29 부터 · BFF 시세 워커도 꺼진 채 발견 — 사용자 "계속 머 까먹어서".
# 데이터를 모으는 프로세스(뉴스 · 시세)는 전부 상시로 둔다. 웹 dev 만 상시가 아니다(빌드 · 재시작이 잦다).
#
# 이름: server · platform · news · bff-rest · bff-ws · bff-worker · forecast · forecast-live · web · web-investment · web-savings · web-household · web-tips
# platform = Kotlin(`salt-platform`, :4010) — S1 저축부터 화면 경로가 있다(`SRV-REQ-045`). RabbitMQ 는 그 스크립트가 Compose 로 띄운다
# 웹 dev 는 zone 마다 하나(셸 web 3000 · 투자 web-investment 3002 — `FE-REQ-053` · 저축 web-savings 3003 — `FE-REQ-056` · 가계부 web-household 3004 — `FE-REQ-057` · 금융 팁 web-tips 3005 — `FE-REQ-058`, 2026-11-13 빠져 있던 것을 넣음). 셸이 도메인 경로를 각 zone 으로 프록시한다
# 웹은 dev 로만 띄운다 — dev 정적 경로는 zone 별(`/investment-static`). 운영 빌드(`next start`)를 여기에 넣으려면 빌드 뒤
# `pnpm static:merge` 가 먼저다(운영 빌드는 모든 zone 이 공용 `/_next` — `ADR-005` 규칙 7 개정 · `FE-REQ-054`, 2026-11-03)
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
LABEL=(server com.salt.server platform com.salt.platform news com.salt.news bff-rest com.salt.bff-rest bff-ws com.salt.bff-ws bff-worker com.salt.bff-worker forecast com.salt.forecast-daily forecast-live com.salt.forecast-live)
SCRIPT=(server "$ROOT/salt-server/ops/run-server.sh" platform "$ROOT/salt-platform/ops/run-platform.sh" news "$ROOT/salt-server/ops/run-news.sh"
        bff-rest "$ROOT/bff/ops/run.sh rest" bff-ws "$ROOT/bff/ops/run.sh ws" bff-worker "$ROOT/bff/ops/run.sh worker"
        forecast "$ROOT/salt-forecast/ops/daily.sh" forecast-live "$ROOT/salt-forecast/ops/live.sh")
PORT=(server 4000 platform 4010 news - bff-rest 4001 bff-ws 4002 bff-worker - forecast - forecast-live - web 3000 web-investment 3002 web-savings 3003 web-household 3004 web-tips 3005)
HEALTH=(server http://localhost:4000/health platform http://localhost:4010/actuator/health bff-rest http://localhost:4001/health)
LOG=(server "$LOGS/salt-server.log" platform "$LOGS/salt-platform.log" news "$LOGS/salt-news.log" bff-rest "$LOGS/salt-bff-rest.log" bff-ws "$LOGS/salt-bff-ws.log"
     bff-worker "$LOGS/salt-bff-worker.log" forecast "$LOGS/salt-forecast-daily.log" forecast-live "$LOGS/salt-forecast-live.log" web "$LOGS/salt-web.log"
     web-investment "$LOGS/salt-web-investment.log" web-savings "$LOGS/salt-web-savings.log"
     web-household "$LOGS/salt-web-household.log" web-tips "$LOGS/salt-web-tips.log")
# 포트 없는 상시 프로세스를 수동으로 띄웠는지 알아보는 명령줄 조각
typeset -A PATTERN
PATTERN=(news "workers/news-crawler.worker" bff-worker "workers/price-updater.worker")
ORDER=(server platform news bff-rest bff-ws bff-worker forecast forecast-live web web-investment web-savings web-household web-tips)
# launchd 가 아니라 pnpm dev 로 띄우는 zone 앱(이름 = pnpm 필터)
DEV_APPS=(web web-investment web-savings web-household web-tips)
is_dev() { (( ${DEV_APPS[(Ie)$1]} )); }
SERVICES=(server platform news bff-rest bff-ws bff-worker forecast forecast-live)

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
  elif [[ $name == forecast-live ]]; then
    # 정각 기준 매시 2분 — 단타 예측은 봉 마감 뒤 15분 안에만 쓴다(FC-REQ-028 FR-1)
    schedule="  <key>StartCalendarInterval</key><dict><key>Minute</key><integer>2</integer></dict>"
  else
    schedule="  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>"
  fi
  local stdlog="$LOGS/$label.launchd.log"
  [[ $name == server ]] && stdlog="$LOGS/salt-server.launchd.log"
  [[ $name == forecast ]] && stdlog="$LOGS/salt-forecast-daily.log"
  [[ $name == forecast-live ]] && stdlog="$LOGS/salt-forecast-live.log"
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
    union all
    -- 국내 시황/공시 제목(F016 단계 B) — 시장 전체를 07~20시 2분 · 밤 30분. 종목 걸린 제목만 쌓여 밤 · 주말엔 성기다 → 6시간
    select '국내 시황 제목 마지막 수집', to_char(max(collected_at) + interval '9 hours','MM-DD HH24:MI'),
           round(extract(epoch from now() at time zone 'utc' - max(collected_at))/3600) || '시간 전',
           case when max(collected_at) is null or max(collected_at) < now() at time zone 'utc' - interval '6 hours' then '✗' else 'ok' end
      -- 매분 수집만 — 백필(F017 단계 6)은 옛 제목을 지금 받아 max 를 덮는다. 게시 뒤 하루 안에 받은 행 · 최근 8일 게시(KR_NEWS_LIVE_LAG_MS)
      from kr_news_title
     where published_at > now() at time zone 'utc' - interval '8 days'
       and collected_at < published_at + interval '1 day'
    union all
    -- 국내 장중 수급 · 업종 지수 — 장중에만 돈다. 장 밖엔 멈춘 게 정상이라 ✗ 없이 시각만(·)
    select '국내 프로그램 매매 마지막 수집', to_char(max(collected_at) + interval '9 hours','MM-DD HH24:MI'),
           round(extract(epoch from now() at time zone 'utc' - max(collected_at))/60) || '분 전', '·'
      from kr_flow_intraday
    union all
    select '국내 업종 지수 마지막 갱신', to_char(max(updated_at) + interval '9 hours','MM-DD HH24:MI'),
           round(extract(epoch from now() at time zone 'utc' - max(updated_at))/60) || '분 전', '·'
      from kr_sector_index_quote
    union all
    -- 지수 · 업종 일별(F016 단계 C — β 재료). 평일 16:05 하루 한 번 → 4일(주말 · 휴일 넘김) 넘으면 ✗
    select '국내 지수 일별 마지막 갱신', to_char(max(updated_at) + interval '9 hours','MM-DD HH24:MI'),
           round(extract(epoch from now() at time zone 'utc' - max(updated_at))/3600) || '시간 전',
           case when max(updated_at) is null or max(updated_at) < now() at time zone 'utc' - interval '4 days' then '✗' else 'ok' end
      from kr_sector_index_daily
    union all
    -- 등락 분해 β · σ(예측 move_beta) — 매일 회차. 3일 넘으면 서버가 β 를 버리기 전(7일)에 알린다
    select '등락 분해 β 마지막 as_of', to_char(max(as_of) at time zone 'Asia/Seoul','MM-DD HH24:MI'),
           round(extract(epoch from now() - max(as_of))/3600) || '시간 전',
           case when max(as_of) is null or max(as_of) < now() - interval '3 days' then '✗' else 'ok' end
      from forecast.move_beta
    union all
    -- 조건부 기저율 · 점검 문턱(예측 base_rate, FC-REQ-028 FR-2) — 매일 회차. 3일 넘으면 점검이 묵은 종가로 조건을 판정한다
    select '기저율 마지막 as_of', to_char(max(as_of) at time zone 'Asia/Seoul','MM-DD HH24:MI'),
           round(extract(epoch from now() - max(as_of))/3600) || '시간 전',
           case when max(as_of) is null or max(as_of) < now() - interval '3 days' then '✗' else 'ok' end
      from forecast.base_rate_stat
    union all
    -- 판단 라벨 등급(예측 judgment_tier, FC-REQ-028 FR-6) — 매일 회차. 3일 넘으면 서버가 전부 참고로 읽는다
    select '등급 마지막 as_of', to_char(max(run_as_of) at time zone 'Asia/Seoul','MM-DD HH24:MI'),
           round(extract(epoch from now() - max(run_as_of))/3600) || '시간 전',
           case when max(run_as_of) is null or max(run_as_of) < now() - interval '3 days' then '✗' else 'ok' end
      from forecast.judgment_tier
    union all
    -- 단타 방향 확률 시험(예측 short_direction, FC-REQ-028 FR-1) — 매일 회차. 3일 넘으면 서버가 시나리오 칸을 stale 로 닫는다
    select '단타 확률 시험 마지막', to_char(max(run_as_of) at time zone 'Asia/Seoul','MM-DD HH24:MI'),
           round(extract(epoch from now() - max(run_as_of))/3600) || '시간 전',
           case when max(run_as_of) is null or max(run_as_of) < now() - interval '3 days' then '✗' else 'ok' end
      from forecast.short_horizon_test
    union all
    -- 오늘 등락 한 줄(③ — F016 단계 D · FEATURE-016 관측). 카드 날에만 생기는 행이라 ✗ 없이 개수만(·) — 통과 · 검사 막음 · LLM 실패(오늘 KST).
    -- 나빠짐 판정은 주간 리포트 move-explain-*.md(시도 ≥ 10 · 막은 비율 > 30%)
    select '오늘 등락 한 줄(오늘)', coalesce(to_char(max(generated_at) at time zone 'Asia/Seoul','MM-DD HH24:MI'), '없음'),
           '통과 ' || count(*) filter (where gate = 'ok') || ' · 검사 막음 ' || count(*) filter (where gate <> 'ok')
             || ' · LLM 실패 ' || (select count(*) from llm_call_logs where purpose = 'move_summary' and not ok
                                    and requested_at >= date_trunc('day', now() at time zone 'Asia/Seoul') - interval '9 hours'),
           '·'
      from move_explanation where trade_date = (now() at time zone 'Asia/Seoul')::date
  " 2>/dev/null | while IFS='|' read -r label at ago mark; do printf "  %-2s %s %s (%s)\n" "$mark" "$label" "$at" "$ago"; done || say "  (DB 조회 실패)"
}

# 수집 · 판단 점검(OPS-003) — "프로세스는 떠 있고 시각도 최신인데 구멍이 있다"를 센다. 코인 · 국내 같은 줄 넷 + 3종 결함 · KIS 한도 · 수면.
# 쿼리는 읽기 전용 · 실패하면 그 줄만 `?`. 국내 유니버스 = 오늘 추적 목록 스냅샷(DB-REQ-044 — kr_stock_quotes 는 밀려난 종목이 남는다)
collection() {
  local KR_TOP_N; KR_TOP_N=$(sed -n 's/^KIS_UNIVERSE_TOP_N=\([0-9]*\).*/\1/p' "$ROOT/salt-server/.env" 2>/dev/null | head -1); KR_TOP_N=${KR_TOP_N:-50}
  local url; url=$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"?]*\).*/\1/p' "$ROOT/salt-server/.env" 2>/dev/null | head -1)
  [[ -z $url ]] && return
  say "  — 수집 점검 (코인 | 국내)"
  psql "$url" -At -F '|' -v ON_ERROR_STOP=0 -v kr_top_n="$KR_TOP_N" -f "$ROOT/ops/collection-status.sql" 2>/dev/null | while IFS='|' read -r label crypto kr; do printf "  %-14s %-34s | %s\n" "$label" "${crypto:-?}" "${kr:-?}"; done
  # 서버 로그 줄 — 지표 저장소가 없어 로그가 지표다(재시작하면 그 뒤부터)
  local log; log=$(ls -t "$LOGS"/salt-server.log* 2>/dev/null | head -1)
  [[ -z $log ]] && return
  local plain; plain=$(sed 's/\x1b\[[0-9;]*m//g' "$log" 2>/dev/null)
  local triad; triad=$(print -r -- "$plain" | grep -a '3종 결함 10분' | tail -1)
  if [[ -z $triad ]]; then say "  ?  3종 결함 — 서버 줄 없음(재시작 뒤 10분 안)"
  else local n=${triad##*합 }; [[ $n == 0 ]] && say "  ok 3종 결함 0 (${triad[1,16]})" || say "  ✗  3종 결함 $n — ${triad#*10분: }"; fi
  # KIS 한도 — 최근 6줄(1시간) 호출 · 초과 합
  local kis; kis=$(print -r -- "$plain" | grep -a 'KIS 10분' | tail -6 | grep -oE '[A-Z0-9]+ [0-9]+/[0-9]+/[0-9]+' | awk '{split($2,a,"/"); c+=a[1]; r+=a[3]} END {if (c>0) printf "%d %d %.1f", c, r, r*100/c}')
  if [[ -z $kis ]]; then say "  ·  KIS 한도 — 최근 1시간 호출 없음"
  else local parts=(${=kis}); (( ${parts[2]} * 100 > ${parts[1]} )) && m="✗" || m="ok"; say "  $m KIS 한도 초과 ${parts[3]}% (최근 1시간 호출 ${parts[1]} · 초과 ${parts[2]})"; fi
  # 수면 — 마지막 깸과 그 뒤 따라잡기 끝
  local wake end; wake=$(print -r -- "$plain" | grep -a '💤→☀️' | tail -1); end=$(print -r -- "$plain" | grep -a '깸 따라잡기 끝' | tail -1)
  if [[ -z $wake ]]; then say "  ·  수면 — 재시작 뒤 없음"
  elif [[ -n $end && ${end[1,19]} > ${wake[1,19]} ]] || [[ ${end[1,19]} == ${wake[1,19]} ]]; then say "  ok ${${wake#*수면 }%% —*} — 따라잡기 끝 ${end[12,16]}"
  else
    local ws; ws=$(date -j -f '%Y-%m-%d %H:%M:%S' "${wake[1,19]}" +%s 2>/dev/null || echo 0)
    (( $(date +%s) - ws > 1800 )) && say "  ✗  ${${wake#*수면 }%% —*} — 깬 지 30분 넘게 따라잡기 안 끝남" || say "  ·  ${${wake#*수면 }%% —*} — 따라잡는 중"
  fi
}

# 패널 칸 채움 점검(OPS-004) — 마지막 실측 회차만 읽는다(서버 워커가 12:30 · 16:30 KST 에 추적 종목 전부의 패널을 부른다)
panel_cells() {
  local url; url=$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"?]*\).*/\1/p' "$ROOT/salt-server/.env" 2>/dev/null | head -1)
  [[ -z $url ]] && return
  say "  — 패널 칸 채움 (코인 | 국내)"
  psql "$url" -At -F '|' -v ON_ERROR_STOP=0 -f "$ROOT/ops/panel-cells.sql" 2>/dev/null | while IFS='|' read -r _ label crypto kr; do printf "  %-14s %-34s | %s\n" "$label" "${crypto:-?}" "${kr:-?}"; done
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
      [[ -z $pid && $name == forecast-live ]] && pid="(매시 2분)"
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
  collection
  panel_cells
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
  usage)
    url=$(sed -n 's/^DATABASE_URL="\{0,1\}\([^"?]*\).*/\1/p' "$ROOT/salt-server/.env" 2>/dev/null | head -1)
    [[ -z $url ]] && { say "  (DB 주소 없음 — salt-server/.env)"; exit 1; }
    say "도메인 사용 — 최근 8주(주 = 월요일 시작 · KST)"
    printf "  %-6s %-10s %6s %8s %6s\n" 주 도메인 활성 재개율 클릭
    psql "$url" -At -F '|' -v ON_ERROR_STOP=1 -f "$ROOT/ops/usage-weekly.sql" | while IFS='|' read -r week domain active resume clicks; do
      printf "  %-6s %-10s %6s %8s %6s\n" "$week" "$domain" "$active" "$resume" "$clicks"
    done ;;
  -h|--help|help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) say "모르는 명령: $1 — up | status | down | restart | logs | plist | usage"; exit 2 ;;
esac
