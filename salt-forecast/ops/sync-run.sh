#!/bin/zsh
# 실행 트리 동기화 — 예측 배치는 개발 작업 트리가 아니라 머지된 main 에 고정한 실행 트리(~/.salt-run)에서 돈다(OPS-002 FR, 2026-11-17).
#
# 왜: 배치가 개발 트리에서 돌면 "지금 도는 코드" = 그때 체크아웃한 브랜치 · 커밋 안 한 수정이다. 2026-11-16 밤 기능 브랜치 커밋이
# 공용 store 파일을 고쳐 동결 재생이 밤새 전부 막혔고(#188 에 이어 두 번째), 실시간 행엔 다른 코드로 계산한 값에 적합 커밋 이름표가 붙었다.
#
# 매시 live.sh 끝(재생 뒤)에 부른다 — 놓친 시각은 옛 코드로 먼저 재생하고 그다음 코드를 바꾼다.
#   1. 실행 트리가 쓴 리포트(새 파일 · 바뀐 파일)를 개발 트리 reports/ 로 옮긴다 — 리포트는 개발 트리에서 커밋한다
#   2. origin/main 이 앞서 있고 일일 · 장중 배치가 안 돌 때만 그 커밋으로 맞춘다(돌고 있으면 다음 시에). 백필은 기다리지 않는다 —
#      5분봉 메우기가 한 번에 평균 4시간 · 최대 20시간이라 기다리면 영영 못 맞춘다(11-17 실측). 백필은 단계마다 새 python 이라
#      한 프로세스 안에서 코드가 섞이지 않는다
#   ops/salt.sh sync 는 개발 트리의 이 스크립트를 SALT_RUN_ROOT 로 부른다 — 실행 트리에 아직 이 파일이 없는 첫 맞춤(머지 직후)도 되게
#   3. 예측 코드(salt-forecast 소스 · 잠금)가 바뀌었으면 단타 시험을 바로 다시 돌려 새 커밋으로 적합한다 — 가드가 옛 적합의
#      이름표로 쓰기를 막으니(short_direction may_write) 그대로 두면 다음 매일 시험까지 실시간 · 재생이 빈다
set -u
RUN="${SALT_RUN_ROOT:-${0:A:h:h:h}}"   # 실행 트리(기본: 이 스크립트가 있는 트리)
RUN="${RUN:A}"
FC="$RUN/salt-forecast"
DEV="${SALT_DEV_ROOT:-}"
ts() { date -u +%FT%TZ; }
if [[ -z $DEV || ${DEV:A} == ${RUN:A} ]]; then
  exit 0  # 개발 트리에서 직접 부른 것 — 동기화할 실행 트리가 아니다
fi
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"

# 1. 리포트 → 개발 트리(실행 트리에서 새로 생기거나 바뀐 것만 — 개발 트리가 더 새것이면 두지 않는다)
git -C "$RUN" ls-files -m -o --exclude-standard -- salt-forecast/reports | while IFS= read -r f; do
  [[ -f "$RUN/$f" ]] || continue
  if [[ ! -e "$DEV/$f" || "$RUN/$f" -nt "$DEV/$f" ]]; then
    mkdir -p "${DEV}/${f:h}" && cp -p "$RUN/$f" "$DEV/$f"
  fi
done

# 2. main 따라가기 — 네트워크가 없으면 다음 시에
GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o ConnectTimeout=10 -o BatchMode=yes" GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=20 \
  git -C "$RUN" fetch -q origin main 2>/dev/null || { echo "[$(ts)] 실행 트리 — fetch 실패, 다음 시에"; exit 0; }
target=$(git -C "$RUN" rev-parse origin/main) || exit 0
head=$(git -C "$RUN" rev-parse HEAD) || exit 0
[[ $target == "$head" ]] && exit 0

LOCK="$RUN/.salt-sync.lock"
shlock -f "$LOCK" -p $$ || { echo "[$(ts)] 실행 트리 — 다른 동기화가 돌고 있다"; exit 0; }
trap 'rm -f "$LOCK"' EXIT
# 일일 · 장중 배치가 도는 중이면 바꾸지 않는다 — 한 실행(예측 · 채점 · 게이트)의 단계들이 다른 코드로 돌면 안 된다
if pgrep -f "$RUN/salt-forecast/ops/(daily|intraday)\.sh" >/dev/null; then
  echo "[$(ts)] 실행 트리 — 다른 배치가 돌고 있어 다음 시에 맞춘다(${head:0:8} → ${target:0:8})"
  exit 0
fi
code_changed=0
git -C "$RUN" diff --quiet "$head" "$target" -- salt-forecast/src salt-forecast/pyproject.toml salt-forecast/uv.lock || code_changed=1
# -f — 실행 트리에서 바뀐 리포트는 1 에서 옮겼다. 실행 트리는 버리는 사본이다
git -C "$RUN" checkout -q -f --detach "$target" || { echo "[$(ts)] 실행 트리 — checkout 실패"; exit 1; }
echo "[$(ts)] 실행 트리 ${head:0:8} → ${target:0:8} (예측 코드 바뀜 $code_changed)"
(cd "$FC" && "$UV" sync --frozen --inexact -q) || echo "[$(ts)] 실행 트리 — uv sync 실패(다음 uv run 이 다시 맞춘다)"
rm -f "$LOCK"; trap - EXIT

# 3. 예측 코드가 바뀌었으면 새 커밋으로 다시 적합 — 매일 시험과 같은 명령(이미 쓴 행 · 지난 적합은 그대로)
if [[ $code_changed == 1 ]]; then
  echo "[$(ts)] 단타 시험 다시 적합(새 커밋 ${target:0:8})"
  (cd "$FC" && "$UV" run --frozen python -m salt_forecast.jobs.short_direction test --no-report) \
    || echo "[$(ts)] 단타 다시 적합 실패 — 다음 매일 시험까지 실시간 · 재생이 빈다(가드)"
fi
