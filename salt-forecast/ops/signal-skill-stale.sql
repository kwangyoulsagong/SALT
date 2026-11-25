-- 종목 판단 과거 검산(signal-skill@1 — 코인 장기 · 코인 단타 · 국내 단타)을 다시 돌릴 때가 됐나(OPS-002) — 1 이면 돈다.
-- 범위는 salt-server/scripts/backtest-signal-skill.ts 가 --write 때 지우고 다시 넣는 범위와 같아야 한다(그 스크립트가 쓰는 것만 센다).
-- 등록 [schedule].end 가 "만기가 실행 시각 이전"이라 실행이 늦을수록 표본이 는다 — 11-10 · 11-16 손 실행 뒤 열흘 묵어
-- 코인 장기 피하기가 판단 날 9 < 10 에 머물렀다(3종 결함 10 → 16, 2026-11-26). 행이 없거나 가장 최근 쓰기가 7일 넘었으면 1.
select (coalesce(max(created_at), '-infinity') < localtimestamp - interval '7 days')::int
from symbol_judgment_snapshots
where sample_origin in ('backtest_full', 'backtest_price_only')
  and (signal_type not like 'kr\_stock.%' or signal_type like 'kr\_stock.scalp.%');
