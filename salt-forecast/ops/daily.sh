#!/bin/zsh
# 매일 1회 — 업비트 일봉 증분 → 시장 · 거시(바이낸스 · DefiLlama · FRED · 공포탐욕) → 대형 체결 증분 → live 예측 · 채점 · 게이트 → 주요 사건(일정 · 반응 통계) → 시장 신호(펀딩비 쏠림 · 김치 프리미엄) → 실현 변동성 · BTC 베타 → 시장 국면.
# salt-server 의 forecast-runner 워커가 서버 부팅 때와 매시 부른다. 마지막 성공이 20시간 안이면 바로 끝난다.
# 단계 하나가 실패해도 나머지는 돈다 — 실패는 종료 코드와 forecast.job_run 에 남는다.
set -u
cd "$(dirname "$0")/.." || exit 1
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"
if [[ "${FORCE:-0}" != "1" ]] && ! "$UV" run --frozen python -m salt_forecast.jobs.due --job daily --hours 20; then
  exit 0
fi
rc=0
# backfill_whale 은 매일 돌면 증분이다(이미 있는 날은 건너뛴다 — 새 날 하루치 30종목만 받는다)
steps=(ingest_prices ingest_market backfill_whale daily events signals volatility market_regime)
# 규칙 IC 백테스트는 주 1회(월요일 UTC) — 매일 돌 이유가 없고 48초 걸린다(FC-REQ-008)
[[ "$(date -u +%u)" == "1" ]] && steps+=(rule_ic)
for step in "${steps[@]}"; do
  echo "[$(date -u +%FT%TZ)] ${step} 시작"
  "$UV" run --frozen python -m "salt_forecast.jobs.${step}" || { echo "[$(date -u +%FT%TZ)] ${step} 실패"; rc=1; }
done
echo "[$(date -u +%FT%TZ)] 끝 rc=${rc}"
exit $rc
