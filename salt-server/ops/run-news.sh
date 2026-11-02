#!/bin/zsh
# 뉴스 수집 워커 상시 실행 — launchd `com.salt.news` 가 부른다(`ops/salt.sh up` 이 plist 를 만든다).
#
# 왜 따로인가: 뉴스 워커(`src/workers/news-crawler.worker.ts`)는 서버 프로세스(`run-server.sh`) 밖에 있다. 사람이 `npm run dev:news` 를
# 기억해서 띄우는 구조라 2026-09-29 09:01(UTC) 이후 한 달 넘게 수집이 멈췄다(2026-11-02 발견 — 해설 인용이 한 달 전 기사였다).
#
# - watch 를 쓰지 않는다(같은 이유 — `run-server.sh`). 로그 `~/Library/Logs/salt-news.log` 20MB × 5
# - 1시간마다 수집 · 시작할 때 한 번
set -u
setopt pipefail
cd "$(dirname "$0")/.." || exit 1
./node_modules/.bin/tsx src/workers/news-crawler.worker.ts 2>&1 | /usr/sbin/rotatelogs -n 5 "$HOME/Library/Logs/salt-news.log" 20M
