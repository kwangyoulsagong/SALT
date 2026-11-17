#!/bin/zsh
# 매시 2분 — 단타 방향 확률 전진 시험(사전등록 short-direction@4, FC-REQ-028 FR-1 · FR-4).
# 업비트 1시간봉 증분(최근 6시간 · 원화 전 종목 약 40초) → (공개된 새 국내 일봉이면) 국내 일봉 옮기기 → 만료 예측 채점 → 시험 칸 전부 예측(p · p_ref).
# 정각 기준이어야 한다 — 예측은 기준 봉 마감 뒤 15분 안에만 쓴다(결과를 알기 전에 기록 · domain/short_direction.written_in_time).
# daily.sh(StartInterval — 불러온 시각 기준)에 두면 매번 15분을 넘겨 코인 예측이 쌓이지 않는다(2026-11-11).
set -u
cd "$(dirname "$0")/.." || exit 1
# 실행 트리 동기화(ops/sync-run.sh) 중이면 끝날 때까지 기다린다 — 최대 2분. 개발 트리엔 이 파일이 없다
for _ in {1..24}; do [[ -e ../.salt-sync.lock ]] || break; sleep 5; done
UV="${UV:-$(command -v uv || echo /opt/homebrew/bin/uv)}"
echo "[$(date -u +%FT%TZ)] live 시작"
"$UV" run --frozen python -m salt_forecast.jobs.ingest_prices --interval 1h --days 0.25 >/dev/null || echo "[$(date -u +%FT%TZ)] 1시간봉 증분 실패"
# 국내 일봉 옮기기 — 16:00 KST 에 공개된 마지막 거래일 봉이 forecast 에 아직 없으면 여기서(서버가 채울 때까지 매시). 매일 배치(20시간 게이트)는 맥이 깨는 아침으로 밀려
# 국내 예측의 09:00 전 기록 창을 매번 놓쳤다(2026-11-12 국내 예측 0 · 늦은 예측 347). 약 1~2분, 하루 한 번
if "$UV" run --frozen python -m salt_forecast.jobs.due --job ingest_kr_stock --kr-bar >/dev/null; then
  "$UV" run --frozen python -m salt_forecast.jobs.ingest_kr_stock >/dev/null || echo "[$(date -u +%FT%TZ)] 국내 일봉 옮기기 실패"
fi
"$UV" run --frozen python -m salt_forecast.jobs.short_direction live || { echo "[$(date -u +%FT%TZ)] short_direction live 실패"; exit 1; }
# 동결 재생(@4) — 맥이 잠든 동안 놓친 기준 시각을 그 시각 전 적합 · 그 시각까지의 봉 · 같은 코드로 다시 쓴다. 놓친 게 없으면 몇 초
"$UV" run --frozen python -m salt_forecast.jobs.short_direction replay || echo "[$(date -u +%FT%TZ)] short_direction replay 실패"
echo "[$(date -u +%FT%TZ)] live 끝"
# 실행 트리면 머지된 main 으로 맞춘다 — 재생 뒤(놓친 시각은 옛 코드로 먼저). exec: 이 파일이 바뀌어도 읽던 쪽이 꼬이지 않게
exec /bin/zsh ops/sync-run.sh
