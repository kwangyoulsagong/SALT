-- 국내 장기 판단 과거 검산이 원장에 있나(OPS-002) — backfill.sh 의 국내 백테스트 게이트가 "0 이면 돈다"로 읽는다.
-- 조건은 salt-server/scripts/backtest-kr-judgments.ts 가 --write 전에 지우는 범위와 같아야 한다(그 스크립트가 쓰는 것만 센다).
-- 전엔 국내 6자리 종목의 backtest% 전부를 셌다 — 11-16 에 들어간 국내 단타 backtest_price_only 1,155행이 게이트를
-- 영영 닫아 장기 백필이 다 찬 뒤에도(11-23) 국내 백테스트가 한 번도 돌지 않았다(장기 3종 결함 53/53).
select count(*) from symbol_judgment_snapshots
where sample_origin in ('backtest', 'backtest_full')
  and signal_type like 'kr\_stock.long\_term.%';
