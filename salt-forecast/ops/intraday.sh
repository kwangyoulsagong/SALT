#!/bin/zsh
# 5분마다 — 장중 기저율 문턱(사전등록 base-rate@3, FC-REQ-028 FR-7 · F017 v4 순서 3).
# 업비트 5분봉 증분(최근 1시간) → 국내 5분봉 옮기기(최근 3일 겹쳐) → 마지막 칸 문턱을 마지막 통계 as_of 로 바꿈.
# 통계(2년 전 구간)는 하루 한 번 daily.sh 가 — 여기는 최근 33일만 읽어 1분 안에 끝난다.
# 업비트 5분봉 백필(ingest_prices_5m)이 도는 동안엔 증분이 "이미 실행 중"으로 건너뛴다 — 백필이 같은 봉을 채운다.
set -u
cd "$(dirname "$0")/.." || exit 1
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"
"$UV" run --frozen python -m salt_forecast.jobs.ingest_prices --interval 5m --days 0.05 >/dev/null || echo "[$(date -u +%FT%TZ)] 코인 5분봉 증분 실패"
"$UV" run --frozen python -m salt_forecast.jobs.ingest_kr_minutes >/dev/null || echo "[$(date -u +%FT%TZ)] 국내 5분봉 옮기기 실패"
"$UV" run --frozen python -m salt_forecast.jobs.base_rate_intraday live >/dev/null || { echo "[$(date -u +%FT%TZ)] 장중 문턱 실패"; exit 1; }
