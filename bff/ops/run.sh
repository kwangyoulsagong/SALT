#!/bin/zsh
# BFF 상시 실행(`OPS-002` · 시세 워커 `BFF-REQ-009` FR-33) — launchd `com.salt.bff-<rest|ws|worker>` 가 부른다(`ops/salt.sh up` 이 plist 를 만든다).
#
# 왜 상시인가: 시세 워커(price-updater)가 업비트 WebSocket 으로 DB 시세를 갱신한다. 꺼지면 코인 시세가 멈춘다 —
# 2026-11-02 꺼진 채 발견(사람이 `npm run dev` 를 기억해서 띄우는 구조였다).
#
# - watch 를 쓰지 않는다 — `tsx watch` 중복 프로세스가 로그 101GB 를 냈다(2026-09-29, `salt-server/ops/run-server.sh`)
# - 로그는 20MB × 5개에서 돈다 — `~/Library/Logs/salt-bff-<이름>.log`
# - 체크아웃된 브랜치 코드로 뜬다. 코드를 바꾸면 `ops/salt.sh restart bff-rest` 처럼 재시작한다
set -u
setopt pipefail
cd "$(dirname "$0")/.." || exit 1

case "${1:-}" in
  rest) entry=src/rest/server.ts ;;
  ws) entry=src/websocket/server.ts ;;
  worker) entry=src/workers/price-updater.worker.ts ;;
  *) echo "사용: run.sh rest|ws|worker" >&2; exit 2 ;;
esac

source ../ops/lib-run.sh
stop_stale "$entry"
case "$1" in rest) wait_port_free 4001 ;; ws) wait_port_free 4002 ;; esac
run_supervised "salt-bff-$1" ./node_modules/.bin/tsx "$entry"
