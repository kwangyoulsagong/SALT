-- 패널 칸 채움 점검(OPS-004) — 마지막 실측 회차(`panel_cell_check`, 하루 두 번 서버 워커)만 읽는다. 읽기 전용 · 표 하나 · 5초 안.
-- 줄 = 이름 | 코인 | 국내. 칸마다 "지금 n · 평소 n · 대체 n · 결함 n", 결함 > 0 이면 앞에 ✗ (FR-1).
-- 회사 사정은 재료(공시 · 본문)가 순서 2 라 늘 결함 — 숨기지 않는다.
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
-- FR-6 — AI 경로 기사 본문 원천이 아직 없다(순서 2) — 셀 수 없음
select 22, '본문 덮임', '? 본문 원천 전', '? 본문 원천 전'
) t order by k;
