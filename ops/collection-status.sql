-- 수집 점검 쿼리(OPS-003) — `ops/salt.sh status` 가 부른다. 읽기 전용 · 줄마다 (이름 | 코인 | 국내).
-- 변수 :kr_top_n = KIS_UNIVERSE_TOP_N. 결함 주입 시험은 BEGIN … 이 파일 … ROLLBACK 으로 한다(ops/collection-status.test.sh)
    with now_kst as (select (now() at time zone 'Asia/Seoul') t),
    kr_open as (select extract(isodow from t) between 1 and 5 and t::time between '09:05' and '15:30' o from now_kst),
    top50 as (select symbol from market_assets where asset_type='crypto' and is_active order by trade_value_24h desc nulls last limit 50),
    -- 지금 유니버스(시총 상위 N ∪ 보유 ∪ 관심 — ResolveKrStockUniverse 와 같은 셈). 스냅샷은 그날의 합집합이라 밀려난 종목이 남는다
    uni as ((select code symbol from kr_stock_master where group_code='ST' and delisted_at is null and is_preferred=false and market_cap is not null
             order by market_cap desc limit :kr_top_n)
            union select symbol from portfolio_holdings where asset_type='kr_stock' and total_quantity > 0
            union select symbol from investment_watchlist where asset_type='kr_stock'),
    -- 지난 5개장일 — 장 달력(market_holidays). price_history 를 종목 없이 훑으면 3초(인덱스가 종목부터)
    kr_days as (select date d from market_holidays where market='KRX' and is_open and date < (select t::date from now_kst)
                order by date desc limit 5),
    kr_cov as (select u.symbol, k.d, (select count(*) from price_history p where p.symbol=u.symbol and p.timeframe='5m'
                 and p.timestamp >= k.d - interval '9 hours' and p.timestamp < k.d + interval '15 hours') n from uni u cross join kr_days k),
    d1 as (select a.symbol, (select count(*) from price_history p where p.symbol=a.symbol and p.timeframe='1d') n1d,
                  (select rsi_14 from technical_indicators t where t.symbol=a.symbol and t.timeframe='d1' order by timestamp desc limit 1) rsi
           from market_assets a where a.asset_type='crypto' and a.is_active),
    kr_last as (select u.symbol,
                  (select max(timestamp) from technical_indicators t where t.symbol=u.symbol and t.timeframe='d1') d1,
                  (select max(timestamp) from technical_indicators t where t.symbol=u.symbol and t.timeframe='m5') m5,
                  (select count(*) from price_history p where p.symbol=u.symbol and p.timeframe='1d') n1d from uni u)
    select '5분봉 마지막',
      (select case when max(l.ts) < now() at time zone 'utc' - interval '15 minutes' then '✗' else 'ok' end || ' ' ||
              round(extract(epoch from now() at time zone 'utc' - max(l.ts))/60) || '분 전'
         from top50 t cross join lateral (select max(timestamp) ts from price_history p where p.symbol=t.symbol and p.timeframe='5m') l),
      (select case when not (select o from kr_open) then '· 장 밖'
                   when max(l.ts) < now() at time zone 'utc' - interval '15 minutes' then '✗ ' || round(extract(epoch from now() at time zone 'utc' - max(l.ts))/60) || '분 전'
                   else 'ok ' || round(extract(epoch from now() at time zone 'utc' - max(l.ts))/60) || '분 전' end
         from uni u cross join lateral (select max(timestamp) ts from price_history p where p.symbol=u.symbol and p.timeframe='5m') l)
    union all
    -- 코인 구멍 = 거래소에 안 물어본 구간(채운 위치가 20분 넘게 밀림 · 없음). 봉 수로 세면 거래 없는 5분(봉 없음)이 구멍으로 보인다
    select '5분봉 구멍',
      (select case when count(*) filter (where t.symbol in (select symbol from top50)) > 0 then '✗' else 'ok' end
              || ' 위치 밀림 상위50 ' || count(*) filter (where t.symbol in (select symbol from top50)) || ' · 전체 ' || count(*)
         from market_assets t left join price_fill_mark m on m.asset_type='crypto' and m.symbol=t.symbol and m.timeframe='5m'
         where t.asset_type='crypto' and t.is_active and (m.filled_through is null or m.filled_through < now() - interval '20 minutes')),
      (select case when count(*) > 0 then '✗' else 'ok' end || ' 지난 5개장일 (종목, 날) 70봉 미만 ' || count(*) from kr_cov where n < 70)
    union all
    select '지표 없음 · 묵음',
      (select case when count(*) > 0 then '✗' else 'ok' end || ' 일봉 15+ 인데 d1 RSI 없음 ' || count(*) from d1 where n1d >= 15 and rsi is null),
      (select case when count(*) > 0 then '✗' else 'ok' end || ' 하루 넘게 밀린 종목 ' || count(*) from kr_last
         where d1 < (select max(d1) from kr_last) - interval '1 day' or m5 < (select max(m5) from kr_last) - interval '1 day' or d1 is null)
    union all
    select '짧은 이력',
      (select '· 일봉 50 미만 ' || count(*) || ' (거래소 이력)' from d1 where n1d < 50),
      (select '· 일봉 120 미만 ' || count(*) from kr_last where n1d < 120);
