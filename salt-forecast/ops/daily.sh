#!/bin/zsh
# 매일 1회 — 업비트 일봉 증분 → 시장 · 거시(바이낸스 · DefiLlama · FRED) → live 예측 · 채점 · 게이트 → 주요 사건(일정 · 반응 통계) → 실현 변동성.
# salt-server 의 forecast-runner 워커가 서버 부팅 때와 매시 부른다. 마지막 성공이 20시간 안이면 바로 끝난다.
# 단계 하나가 실패해도 나머지는 돈다 — 실패는 종료 코드와 forecast.job_run 에 남는다.
set -u
cd "$(dirname "$0")/.." || exit 1
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"
if [[ "${FORCE:-0}" != "1" ]] && ! "$UV" run --frozen python -m salt_forecast.jobs.due --job daily --hours 20; then
  exit 0
fi
rc=0
for step in ingest_prices ingest_market daily events volatility; do
  echo "[$(date -u +%FT%TZ)] ${step} 시작"
  "$UV" run --frozen python -m "salt_forecast.jobs.${step}" || { echo "[$(date -u +%FT%TZ)] ${step} 실패"; rc=1; }
done
echo "[$(date -u +%FT%TZ)] 끝 rc=${rc}"
exit $rc
