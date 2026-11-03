#!/bin/zsh
# salt-platform(Kotlin) 상시 실행 — launchd `com.salt.platform`(`ops/salt.sh up` 이 plist 를 만든다, `OPS-002`).
#
# 왜 상시인가: S1(`SRV-REQ-045`, 2026-11-03)부터 저축 화면 경로(`/api/savings/*`)가 이 프로세스에 있다 — BFF 라우팅 표가 `/savings` 를 platform 으로 보낸다.
# 꺼지면 저축 화면 · 홈 저축 카드가 degraded 가 된다.
#
# - 로컬 운영 DB(salt_db :5432)에 **서비스 계정**으로 붙는다(svc_ping · svc_savings — `db/roles.sql`). 비밀은 salt-platform/.env 의 LOCAL_DB_*_PASSWORD
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
export RABBITMQ_HOST=localhost RABBITMQ_PORT=55672 PORT=4010

docker compose up -d rabbitmq >/dev/null 2>&1 || echo "rabbitmq 컨테이너를 못 띄웠다(Docker 꺼짐?) — 30초 뒤 launchd 가 다시 부른다" >&2
for _ in {1..30}; do nc -z localhost 55672 2>/dev/null && break; sleep 1; done

# JDK 21 — Gradle 툴체인이 받은 것(~/.gradle/jdks). `java_home -v 21` 은 21 이 없으면 17 을 돌려줘 쓰지 않는다
JAVA="$(print -l ~/.gradle/jdks/*21*/*/Contents/Home/bin/java(N) | head -1)"
[[ -x $JAVA ]] || { echo "JDK 21 이 없다 — ./gradlew 를 한 번 돌리면 툴체인을 받는다" >&2; exit 1; }

source ../ops/lib-run.sh
stop_stale "salt-platform.jar"
wait_port_free 4010
run_supervised salt-platform "$JAVA" -jar app/build/libs/salt-platform.jar
