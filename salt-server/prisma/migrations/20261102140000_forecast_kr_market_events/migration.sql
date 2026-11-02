-- DB-REQ-034 FR-1 · FR-2 · FR-3 · FR-7 (2026-11-02, F008 슬라이스 24 1단계 · FC-REQ-021) — 국내 시장 일정 종류 · 종목 사건 키 · 다가오는 일정 뷰.
-- 쓰기는 salt-forecast 만, 서버는 뷰만 읽는다(db-contract.md §1 · §2).
--
-- 롤백(1단계 뒤 — 종목 사건 행 symbol <> '' 이 아직 없다):
--   DROP VIEW forecast.v_upcoming_event; v_event_card 를 20261007120000 정의로 DROP · CREATE;
--   event_reaction FK · PK 를 (kind, event_at) · (kind, event_at, symbol) 로, event_symbol 열 drop;
--   scheduled_event PK 를 (kind, event_at) 로, symbol 열 drop; DELETE kind LIKE 'kr_%' 뒤 CHECK 를 3종으로.

-- FR-1 — 종류: 미국 거시 3 + 국내 시장 일정 4
ALTER TABLE forecast.scheduled_event DROP CONSTRAINT scheduled_event_kind_check;
ALTER TABLE forecast.scheduled_event ADD CONSTRAINT scheduled_event_kind_check
  CHECK (kind IN ('fomc', 'cpi', 'jobs', 'kr_bok_rate', 'kr_cpi', 'kr_trade', 'kr_quad_expiry'));

-- FR-2 — 종목 사건은 같은 시각 여러 종목이다. 시장 일정 = ''
ALTER TABLE forecast.scheduled_event ADD COLUMN symbol text NOT NULL DEFAULT '';
ALTER TABLE forecast.event_reaction ADD COLUMN event_symbol text NOT NULL DEFAULT '';

ALTER TABLE forecast.event_reaction DROP CONSTRAINT event_reaction_kind_event_at_fkey;
ALTER TABLE forecast.scheduled_event DROP CONSTRAINT scheduled_event_pkey;
ALTER TABLE forecast.scheduled_event ADD CONSTRAINT scheduled_event_pkey PRIMARY KEY (kind, event_at, symbol);
ALTER TABLE forecast.event_reaction DROP CONSTRAINT event_reaction_pkey;
ALTER TABLE forecast.event_reaction ADD CONSTRAINT event_reaction_pkey PRIMARY KEY (kind, event_at, symbol, event_symbol);
ALTER TABLE forecast.event_reaction ADD CONSTRAINT event_reaction_event_fkey
  FOREIGN KEY (kind, event_at, event_symbol) REFERENCES forecast.scheduled_event (kind, event_at, symbol) ON DELETE CASCADE;

-- FR-3 — 종목 사건은 그 종목 행에만. 열은 끝에 하나(event_symbol) — 서버가 시장 · 종목 사건을 가른다
CREATE OR REPLACE VIEW forecast.v_event_card AS
SELECT
  e.kind, e.event_at, e.announced_at, e.source,
  s.symbol, s.horizon_days, s.as_of, s.sample,
  s.q05, s.q25, s.q50, s.q75, s.q95, s.up_rate,
  s.baseline_q05, s.baseline_q50, s.baseline_q95, s.move_ratio, s.pre_return_5d_median,
  s.recent_misses, s.recent_events, s.renderable, s.blocked_reason,
  s.window_from, s.window_to, s.miss_count, s.miss_judged,
  e.symbol AS event_symbol
FROM forecast.scheduled_event e
JOIN LATERAL (
  SELECT DISTINCT ON (st.symbol, st.horizon_days) st.*
  FROM forecast.event_reaction_stats st
  WHERE st.kind = e.kind
    AND (e.symbol = '' OR st.symbol = e.symbol)
  ORDER BY st.symbol, st.horizon_days, st.as_of DESC
) s ON true
WHERE e.event_at >= now() - interval '1 day'
  AND e.event_at <  now() + interval '35 days';

-- FR-7 — 다가오는 일정(날짜 · 종류만, 분포 없음 — SRV-REQ-041 FR-5). 통계가 아직 없는 일정도 보인다
CREATE VIEW forecast.v_upcoming_event AS
SELECT e.kind, e.event_at, e.symbol AS event_symbol, e.source
FROM forecast.scheduled_event e
WHERE e.event_at >= now() - interval '1 day'
  AND e.event_at <  now() + interval '35 days';
