-- DB-REQ-029 FR-14 · FR-15 (2026-09-24, F008 슬라이스 22 · FC-REQ-005) — 주요 사건(거시 일정) · 사건 뒤 반응 통계.
-- 쓰기는 salt-forecast 만, 서버는 v_event_card 뷰만 읽는다(db-contract.md §1 · §2). 수익률은 double, 시각은 timestamptz(UTC).

-- 일정. announced_at = 이 일정을 알 수 있게 된 시각(누수 키 — time-and-leakage.md §1)
CREATE TABLE forecast.scheduled_event (
  kind          text        NOT NULL CHECK (kind IN ('fomc', 'cpi', 'jobs')),
  event_at      timestamptz NOT NULL,
  announced_at  timestamptz NOT NULL,
  source        text        NOT NULL,
  source_ref    text        NOT NULL,
  ingested_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, event_at),
  CHECK (announced_at <= event_at)
);

-- 사건 하나 × 종목 하나의 반응. 창이 아직 안 닫힌 기간은 null
CREATE TABLE forecast.event_reaction (
  kind              text             NOT NULL,
  event_at          timestamptz      NOT NULL,
  symbol            text             NOT NULL,
  ref_bar_open      timestamptz      NOT NULL,
  pre_return_5d     double precision,
  pre_volume_ratio  double precision,
  ret_1d            double precision,
  ret_5d            double precision,
  ret_20d           double precision,
  computed_at       timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, event_at, symbol),
  FOREIGN KEY (kind, event_at) REFERENCES forecast.scheduled_event (kind, event_at) ON DELETE CASCADE
);

-- 워크포워드 통계. as_of 에 창이 닫힌 사건만. 막히면 분포 칸이 null
CREATE TABLE forecast.event_reaction_stats (
  kind                 text             NOT NULL,
  symbol               text             NOT NULL,
  horizon_days         smallint         NOT NULL CHECK (horizon_days IN (1, 5, 20)),
  as_of                timestamptz      NOT NULL,
  sample               integer          NOT NULL,
  q05                  double precision,
  q25                  double precision,
  q50                  double precision,
  q75                  double precision,
  q95                  double precision,
  up_rate              double precision,
  baseline_q05         double precision,
  baseline_q50         double precision,
  baseline_q95         double precision,
  move_ratio           double precision,
  pre_return_5d_median double precision,
  recent_misses        jsonb,
  recent_events        jsonb,
  renderable           boolean          NOT NULL,
  blocked_reason       text,
  PRIMARY KEY (kind, symbol, horizon_days, as_of)
);
CREATE INDEX event_reaction_stats_latest ON forecast.event_reaction_stats (symbol, kind, horizon_days, as_of DESC);

-- 서버가 읽는 계약: 앞으로 35일(지난 하루 포함) 일정 × 종목별 최신 통계
CREATE VIEW forecast.v_event_card AS
SELECT
  e.kind, e.event_at, e.announced_at, e.source,
  s.symbol, s.horizon_days, s.as_of, s.sample,
  s.q05, s.q25, s.q50, s.q75, s.q95, s.up_rate,
  s.baseline_q05, s.baseline_q50, s.baseline_q95, s.move_ratio, s.pre_return_5d_median,
  s.recent_misses, s.recent_events, s.renderable, s.blocked_reason
FROM forecast.scheduled_event e
JOIN LATERAL (
  SELECT DISTINCT ON (st.symbol, st.horizon_days) st.*
  FROM forecast.event_reaction_stats st
  WHERE st.kind = e.kind
  ORDER BY st.symbol, st.horizon_days, st.as_of DESC
) s ON true
WHERE e.event_at >= now() - interval '1 day'
  AND e.event_at <  now() + interval '35 days';
