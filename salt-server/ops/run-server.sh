#!/bin/zsh
# salt-server 상시 실행 — launchd `com.salt.server`(같은 폴더 plist)가 부른다. 배포 환경이 없어서 이 맥이 서버다.
#
# 왜 상시인가: 시세 수집 워커(KIS 국내 주식 · 업비트)와 전망 배치 실행기(forecast-runner)가 **서버 프로세스 안**에 있다.
# 서버가 꺼지면 국내 일봉이 멈추고 → 전망 신선도 게이트가 국내 카드를 전부 끈다(2026-10-09 · 10-20 두 번, F011 5c · 5d).
#
# - watch 를 쓰지 않는다 — `tsx watch` 중복 프로세스가 로그 101GB 를 냈다(2026-09-29). 코드를 바꾸면 손으로 재시작한다
# - 로그는 20MB × 5개에서 돈다(`rotatelogs -n`) — 최대 약 100MB
# - 체크아웃된 브랜치 코드로 뜬다. 다른 브랜치 서버를 띄우려면 먼저 내린다(포트 4000 하나)
#
# 설치 · 재시작 · 내리기:
#   cp ops/com.salt.server.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.salt.server.plist
#   launchctl kickstart -k gui/$(id -u)/com.salt.server
#   launchctl unload ~/Library/LaunchAgents/com.salt.server.plist
set -u
setopt pipefail
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.nvm/versions/node/v22.12.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
./node_modules/.bin/tsx src/server.ts 2>&1 | /usr/sbin/rotatelogs -n 5 "$HOME/Library/Logs/salt-server.log" 20M
