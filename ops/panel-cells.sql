-- 패널 칸 채움 점검(OPS-004) — 마지막 실측 회차(`panel_cell_check`, 하루 두 번 서버 워커)만 읽는다. 읽기 전용 · 표 하나 · 5초 안.
-- 줄 = 이름 | 코인 | 국내. 칸마다 "지금 n · 평소 n · 대체 n · 결함 n", 결함 > 0 이면 앞에 ✗ (FR-1).
-- 회사 사정은 추출 사실(DART 공시 · 켜진 매체 본문 — F017 v4 2b · 2c)이 없는 종목이면 결함 — 숨기지 않는다.
with last as (select max(run_at) as at from panel_cell_check),
cur as (select c.* from panel_cell_check c, last where c.run_at = last.at),
names(cell_key, label, ord) as (values
  ('scenario.1h','시나리오 1시간',1), ('scenario.4h','시나리오 4시간',2), ('scenario.1d','시나리오 1일',3), ('scenario.5d','시나리오 5일',4),
  ('verdict','점검 한 줄',5), ('cause','원인 근거 결과',6), ('company','회사 사정',7),
  ('track.scalp','성적(단타)',8), ('track.long_term','성적(장기)',9), ('explanation.scalp','해설(단타)',10), ('explanation.long_term','해설(장기)',11)),
cell as (
  select n.ord, n.label, m.market,
         count(*) filter (where c.tier = 'now') as now_n, count(*) filter (where c.tier = 'usual') as usual_n,
         count(*) filter (where c.tier = 'longer') as longer_n, count(*) filter (where c.tier = 'defect') as defect_n
    from names n cross join (values ('crypto'), ('kr')) m(market)
    left join cur c on c.cell_key = n.cell_key and c.market = m.market
   group by n.ord, n.label, m.market),
fmt as (
  select ord, label, market,
         case when now_n + usual_n + longer_n + defect_n = 0 then '?'
              else (case when defect_n > 0 then '✗ ' else 'ok ' end)
                   || '지금 ' || now_n || ' · 평소 ' || usual_n || ' · 대체 ' || longer_n || ' · 결함 ' || defect_n end as v
    from cell)
select * from (
select 0 as k, '마지막 실측',
       coalesce(to_char((select at from last) at time zone 'utc' at time zone 'Asia/Seoul', 'MM-DD HH24:MI'), '없음'),
       case when (select at from last) is null then '✗ 실측 없음'
            when (select at from last) < now() at time zone 'utc' - interval '26 hours' then '✗ 26시간 넘게 안 돎'
            else 'ok ' || (select count(distinct symbol) from cur) || '종목' end
union all
select ord, label, max(v) filter (where market = 'crypto'), max(v) filter (where market = 'kr')
  from fmt group by ord, label
union all
-- FR-2 — 서버 점검이 기준 종가가 묵었다고 본 종목(빈 칸이 아니라 마지막 값으로 보인다)
select 20, '멈춘 종목',
       (select (case when count(distinct symbol) > 0 then '✗ ' else 'ok ' end) || count(distinct symbol) from cur where stale and market = 'crypto'),
       (select (case when count(distinct symbol) > 0 then '✗ ' else 'ok ' end) || count(distinct symbol) from cur where stale and market = 'kr')
union all
-- FR-4 — 지난 회차에 없던 종목 중 결함 칸이 있는 종목(회사 사정 빼고)
select 21, '새 종목 빈 칸',
       (select (case when count(distinct symbol) filter (where tier = 'defect' and cell_key <> 'company') > 0 then '✗ ' else 'ok ' end)
               || count(distinct symbol) filter (where tier = 'defect' and cell_key <> 'company') || ' / 새 ' || count(distinct symbol)
          from cur where new_symbol and market = 'crypto'),
       (select (case when count(distinct symbol) filter (where tier = 'defect' and cell_key <> 'company') > 0 then '✗ ' else 'ok ' end)
               || count(distinct symbol) filter (where tier = 'defect' and cell_key <> 'company') || ' / 새 ' || count(distinct symbol)
          from cur where new_symbol and market = 'kr')
union all
-- FR-6 — AI 경로 본문 덮임(SRV-REQ-058 FR-6). 지난 24시간(1시간 전까지) 종목에 묶인 제목 중 1시간 안에 본문이 생긴 비율.
-- 앞 숫자 = 제목 전체 기준 · '허용' = 약관 · robots 가 허락한 매체 제목만(목표 90% — 미만 ✗) · '막힘' = 매체가 막아 못 덮는 몫
-- 매체별 · 빠진 매체 상위는 ops/ai-body-coverage.sql
select 22, '본문 덮임', cov.coin, cov.kr from (
  with win as (select now() - interval '25 hours' as lo, now() - interval '1 hour' as hi),
  titles as (
    select 'kr' as market, 'kr:' || t.serial as key from kr_news_title t, win
     where t.kind = 'news' and not t.promo
       and t.published_at >= (win.lo at time zone 'utc') and t.published_at < (win.hi at time zone 'utc')
       and (select count(*) from kr_news_title_symbol s where s.serial = t.serial) between 1 and 2
    union all
    select 'coin', 'coin:' || a.id from news_articles a, win
     where a.published_at >= (win.lo at time zone 'utc') and a.published_at < (win.hi at time zone 'utc')
       and cardinality(a.symbols) between 1 and 2),
  joined as (
    select t.market, b.status, o.enabled,
           (b.status = 'ok' and b.fetched_at <= b.title_published_at + interval '1 hour') as covered
      from titles t left join news_ai_body b on b.key = t.key left join news_outlet o on o.id = b.outlet_id),
  agg as (
    select market, count(*) as n, count(*) filter (where covered) as c,
           count(*) filter (where enabled) as allowed_n, count(*) filter (where enabled and covered) as allowed_c,
           count(*) filter (where status = 'blocked' or enabled is false) as blocked_n
      from joined group by market),
  fmt as (
    select market,
           case when n = 0 then '? 제목 0'
                else (case when allowed_n = 0 or allowed_c * 100 < allowed_n * 90 then '✗ ' else 'ok ' end)
                     || round(c * 100.0 / n) || '% · 허용 ' || coalesce(round(allowed_c * 100.0 / nullif(allowed_n, 0)) || '%', '-')
                     || ' · 막힘 ' || round(blocked_n * 100.0 / n) || '%' end as v
      from agg)
  select coalesce((select v from fmt where market = 'coin'), '? 제목 0') as coin,
         coalesce((select v from fmt where market = 'kr'), '? 제목 0') as kr
) cov
) t order by k;
