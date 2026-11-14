-- AI 경로 본문 덮임 — 시장 · 매체별(SRV-REQ-058 FR-6). 읽기 전용. 기본 창 = 지난 24시간(1시간 전까지).
-- 줄 = 시장 | 매체(원장 이름 → 목록 id) | 판정(켜짐 · 약관 막힘 · robots 막힘 · 목록 없음) | 제목 수 | 1시간 안 덮음 | 상태 분포
-- 빠진 매체 상위(제목 수 큰 순)가 다음에 목록에 더할 후보다 — 켜기 전 robots · 약관 원문을 읽는다(news/domain/Outlets.ts)
with win as (select now() - interval '25 hours' as lo, now() - interval '1 hour' as hi),
titles as (
  select 'kr' as market, 'kr:' || t.serial as key, t.provider_name as name from kr_news_title t, win
   where t.kind = 'news' and not t.promo
     and t.published_at >= (win.lo at time zone 'utc') and t.published_at < (win.hi at time zone 'utc')
     and (select count(*) from kr_news_title_symbol s where s.serial = t.serial) between 1 and 2
  union all
  select 'coin', 'coin:' || a.id,
         case when a.source like 'GoogleNews%' then coalesce(substring(a.title from ' - ([^-]+)$'), '(꼬리 없음)') else a.source end
    from news_articles a, win
   where a.published_at >= (win.lo at time zone 'utc') and a.published_at < (win.hi at time zone 'utc')
     and cardinality(a.symbols) between 1 and 2)
select t.market, t.name || coalesce(' → ' || b.outlet_id, '') as outlet,
       case when b.outlet_id is null then '목록 없음' when o.enabled then '켜짐'
            when o.terms_verdict = 'blocks' then '약관 막힘' else 'robots ' || o.robots_verdict end as verdict,
       count(*) as titles,
       count(*) filter (where b.status = 'ok' and b.fetched_at <= b.title_published_at + interval '1 hour') as covered_1h,
       string_agg(distinct coalesce(b.status, '미판정'), ',') as statuses
  from titles t left join news_ai_body b on b.key = t.key left join news_outlet o on o.id = b.outlet_id
 group by 1, 2, 3
 order by 1, 4 desc;
