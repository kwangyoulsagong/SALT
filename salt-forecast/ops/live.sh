#!/bin/zsh
# 매시 2분 — 단타 방향 확률 전진 시험(사전등록 short-direction@3, FC-REQ-028 FR-1 · FR-4).
# 업비트 1시간봉 증분(최근 6시간 · 원화 전 종목 약 40초) → (공개된 새 국내 일봉이면) 국내 일봉 옮기기 → 만료 예측 채점 → 시험 칸 전부 예측(p · p_ref).
# 정각 기준이어야 한다 — 예측은 기준 봉 마감 뒤 15분 안에만 쓴다(결과를 알기 전에 기록 · domain/short_direction.written_in_time).
# daily.sh(StartInterval — 불러온 시각 기준)에 두면 매번 15분을 넘겨 코인 예측이 쌓이지 않는다(2026-11-11).
set -u
cd "$(dirname "$0")/.." || exit 1
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"
echo "[$(date -u +%FT%TZ)] live 시작"
"$UV" run --frozen python -m salt_forecast.jobs.ingest_prices --interval 1h --days 0.25 >/dev/null || echo "[$(date -u +%FT%TZ)] 1시간봉 증분 실패"
# 국내 일봉 옮기기 — 16:00 KST 에 공개된 마지막 거래일 봉이 forecast 에 아직 없으면 여기서(서버가 채울 때까지 매시). 매일 배치(20시간 게이트)는 맥이 깨는 아침으로 밀려
# 국내 예측의 09:00 전 기록 창을 매번 놓쳤다(2026-11-12 국내 예측 0 · 늦은 예측 347). 약 1~2분, 하루 한 번
if "$UV" run --frozen python -m salt_forecast.jobs.due --job ingest_kr_stock --kr-bar >/dev/null; then
  "$UV" run --frozen python -m salt_forecast.jobs.ingest_kr_stock >/dev/null || echo "[$(date -u +%FT%TZ)] 국내 일봉 옮기기 실패"
fi
"$UV" run --frozen python -m salt_forecast.jobs.short_direction live || { echo "[$(date -u +%FT%TZ)] short_direction live 실패"; exit 1; }
echo "[$(date -u +%FT%TZ)] live 끝"
