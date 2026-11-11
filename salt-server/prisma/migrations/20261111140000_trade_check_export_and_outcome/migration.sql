-- F017 v2 단계 2 (2026-11-11) — 점검 채점. FC-REQ-028 FR-4 · DB-REQ-043 FR-7.
-- 추가만. 롤백 = DROP TABLE forecast.trade_check_outcome · DROP VIEW public.v_trade_check_ledger_export.
--
-- ① 예측은 public 표를 새로 직접 읽지 않는다(DB-REQ-036 FR-3 목록을 늘리지 않음) — export 뷰로만(msa-services.md §5).
--    S5 에 coach 스키마로 옮길 때 이 뷰 이름만 옮긴다. 사용자 열은 원장에도 뷰에도 없다
CREATE VIEW public.v_trade_check_ledger_export AS
SELECT id, prereg_key, symbol, market, side, condition_id, horizon, ref_at, status, up_rate, sample_eff,
       price_at_check::float8 AS price_at_check, checked_at
FROM public.trade_check_ledger;

-- ② 채점 결과 — 쓰기는 salt-forecast 만. 원장 한 줄 = 결과 한 줄(기간이 지나면)
CREATE TABLE forecast.trade_check_outcome (
  ledger_id      text        PRIMARY KEY,         -- public.trade_check_ledger.id
  market         text        NOT NULL CHECK (market IN ('kr', 'crypto')),
  side           text        NOT NULL CHECK (side IN ('buy', 'sell')),
  condition_id   text        NOT NULL,
  horizon        integer     NOT NULL,
  shown_up_rate  double precision,                -- 그때 보여 준 비율(없으면 NULL — 표본 미달)
  end_at         timestamptz NOT NULL,            -- 결과로 쓴 봉의 available_at
  realized       double precision NOT NULL,       -- 로그수익 — 사기 전은 비용 뒤, 팔기 전은 비용 전(점검 문장과 같은 정의)
  went_up        boolean     NOT NULL,            -- realized > 0
  scored_at      timestamptz NOT NULL
);
CREATE INDEX trade_check_outcome_end ON forecast.trade_check_outcome (end_at);
