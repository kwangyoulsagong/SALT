-- DB-REQ-034 FR-4 · FR-5 · FR-8 (2026-11-17, F008 슬라이스 24 2단계 · FC-REQ-021 FR-11~15) — 종목 실적 사건 · 예상 창.
-- 추가만(CHECK 넓히기 · 표 · 뷰). 쓰기는 salt-forecast 만, 서버(coach)는 뷰만 읽는다(db-contract.md §1 · §2). 사용자 열 0.
-- 롤백: DROP VIEW forecast.v_kr_earnings_reaction, forecast.v_kr_earnings_window; DROP TABLE forecast.kr_earnings_window;
--       DELETE FROM forecast.scheduled_event WHERE kind IN ('kr_earnings', 'kr_ir'); CHECK 를 20261102140000 의 7종으로.

-- FR-4 — 종목 사건 두 종류. kr_earnings = 실적 숫자가 처음 공개된 공시(접수) · kr_ir = 확정 실적 발표 일정(실적 IR · 결산실적 예고)
ALTER TABLE forecast.scheduled_event DROP CONSTRAINT scheduled_event_kind_check;
ALTER TABLE forecast.scheduled_event ADD CONSTRAINT scheduled_event_kind_check
  CHECK (kind IN ('fomc', 'cpi', 'jobs', 'kr_bok_rate', 'kr_cpi', 'kr_trade', 'kr_quad_expiry', 'kr_earnings', 'kr_ir'));

-- FR-5 — 다음 실적 공시 예상 창. 같은 결산 유형(분기 · 연간)의 과거 '결산일 → 첫 실적 공시' 일수로.
-- hits / judged = 과거 결산마다 그 전 공시만으로 만든 창에 실제 공시일이 들었나(워크포워드 채점) · misses = 빗나간 결산(최근 3).
-- deadline = 법정 제출 기한(분기 · 반기 +45일 · 사업연도 +90일) — 창과 비교하는 기준. 실행마다 쌓는다(as_of)
CREATE TABLE forecast.kr_earnings_window (
  symbol             text        NOT NULL,
  as_of              timestamptz NOT NULL,
  period_end         date        NOT NULL,                   -- 다음에 공시될 결산의 끝날
  annual             boolean     NOT NULL,
  quarter_lag_min    integer,
  quarter_lag_median integer,
  quarter_lag_max    integer,
  sample             integer     NOT NULL,
  window_from        date,
  window_to          date,
  deadline           date        NOT NULL,
  hits               integer     NOT NULL,
  judged             integer     NOT NULL,
  misses             jsonb       NOT NULL DEFAULT '[]'::jsonb, -- [{periodEnd, actual, from, to}]
  confirmed_at       timestamptz,                             -- 확정 일정(kr_ir) — 있으면 창 대신
  confirmed_time_known boolean,
  confirmed_source   text        CHECK (confirmed_source IN ('ir', 'preview')),
  renderable         boolean     NOT NULL,
  blocked_reason     text,
  computed_at        timestamptz NOT NULL,
  PRIMARY KEY (symbol, as_of)
);

-- 종목별 최신 1행
CREATE VIEW forecast.v_kr_earnings_window AS
SELECT DISTINCT ON (symbol) *
FROM forecast.kr_earnings_window
ORDER BY symbol, as_of DESC;

-- FR-8 — 실적 공시 뒤 반응(기간별 최신 1행). 실적은 날짜를 미리 모르니 v_event_card(앞 35일 일정)에 못 탄다 — 창과 같이 읽는다
CREATE VIEW forecast.v_kr_earnings_reaction AS
SELECT DISTINCT ON (symbol, horizon_days) *
FROM forecast.event_reaction_stats
WHERE kind = 'kr_earnings'
ORDER BY symbol, horizon_days, as_of DESC;
