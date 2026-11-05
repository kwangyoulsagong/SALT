#!/bin/zsh
# salt-platform(Kotlin) 상시 실행 — launchd `com.salt.platform`(`ops/salt.sh up` 이 plist 를 만든다, `OPS-002`).
#
# 왜 상시인가: S1(`SRV-REQ-045`, 2026-11-03)부터 저축 화면 경로(`/api/savings/*`), 가계부 S1a(`SRV-REQ-046`, 2026-11-04)부터 가계부(`/api/household/*`)가, 금융 팁 S2a(`SRV-REQ-047`, 2026-11-05)부터 금융 팁(`/api/content/*`)이
# 이 프로세스에 있다 — BFF 라우팅 표가 `/savings` · `/household` 를 platform 으로 보낸다.
# 꺼지면 저축 · 가계부 화면과 홈 카드 둘이 degraded 가 된다.
#
# - 로컬 운영 DB(salt_db :5432)에 **서비스 계정**으로 붙는다(svc_ping · svc_savings · svc_household · svc_content — `db/roles.sql`). 비밀은 salt-platform/.env 의 LOCAL_DB_*_PASSWORD
# - RabbitMQ 는 Compose 의 것 하나만(55672) — 없으면 여기서 띄운다. Postgres · platform 컨테이너는 띄우지 않는다(호스트 DB 를 쓴다)
# - 실행 산출물은 `./gradlew :app:bootJar` 의 jar — 코드를 바꾸면 bootJar 뒤 `ops/salt.sh restart platform`
set -u
setopt pipefail
cd "$(dirname "$0")/.." || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.docker/bin:/Applications/Docker.app/Contents/Resources/bin"

set -a; source ./.env; set +a
export SALT_DB_URL="jdbc:postgresql://localhost:5432/salt_db"
export PING_DB_PASSWORD="$LOCAL_DB_PING_PASSWORD"
export SAVINGS_DB_PASSWORD="$LOCAL_DB_SAVINGS_PASSWORD"
export HOUSEHOLD_DB_PASSWORD="$LOCAL_DB_HOUSEHOLD_PASSWORD"
export CONTENT_DB_PASSWORD="$LOCAL_DB_CONTENT_PASSWORD"
export RABBITMQ_HOST=localhost RABBITMQ_PORT=55672 PORT=4010

# 이미 떠 있으면 compose 를 부르지 않는다 — launchd 아래 compose 는 데스크탑의 compose.yaml 을 읽다 개인정보 보호 창을 기다리며 멈출 수 있다(2026-11-03).
# 컨테이너는 restart 정책 없이도 Docker 가 살아 있는 동안 남는다. 없을 때만 띄우고, 20초 넘게 걸리면 끊는다(launchd 가 30초 뒤 다시 부른다)
if ! nc -z localhost 55672 2>/dev/null; then
  docker compose up -d rabbitmq >/dev/null 2>&1 &
  compose_pid=$!
  for _ in {1..20}; do kill -0 $compose_pid 2>/dev/null || break; sleep 1; done
  kill $compose_pid 2>/dev/null && echo "rabbitmq 를 20초 안에 못 띄웠다(Docker 꺼짐 · 권한 창?) — 다시 시도한다" >&2
fi
for _ in {1..30}; do nc -z localhost 55672 2>/dev/null && break; sleep 1; done

# JDK 21 — Gradle 툴체인이 받은 것(~/.gradle/jdks). `java_home -v 21` 은 21 이 없으면 17 을 돌려줘 쓰지 않는다
JAVA="$(print -l ~/.gradle/jdks/*21*/*/Contents/Home/bin/java(N) | head -1)"
[[ -x $JAVA ]] || { echo "JDK 21 이 없다 — ./gradlew 를 한 번 돌리면 툴체인을 받는다" >&2; exit 1; }

source ../ops/lib-run.sh
stop_stale "salt-platform.jar"
wait_port_free 4010
# launchd 아래 java 는 데스크탑 폴더(macOS 개인정보 보호)의 jar 를 열지 못하고 open() 에서 멈춘다(2026-11-03 실측 — 허용 창을 기다림).
# 보호 폴더 밖으로 복사해 띄운다. 읽는 쪽(zsh)은 이미 허용돼 있다. 비밀(.env)은 위에서 zsh 가 읽어 환경 변수로 넘긴다
RUN_DIR="$HOME/Library/Application Support/SALT"
mkdir -p "$RUN_DIR"
cp -f app/build/libs/salt-platform.jar "$RUN_DIR/salt-platform.jar"
cd "$RUN_DIR" || exit 1
run_supervised salt-platform "$JAVA" -jar "$RUN_DIR/salt-platform.jar"
