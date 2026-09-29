-- F010 target-weight@2 (2026-09-29) — core 모델 포트폴리오 라이브 원장. DB-REQ-029 FR-21 · FC-REQ-013.
-- 추가만. 롤백 = DROP VIEW forecast.v_target_weight_live · DROP TABLE forecast.target_weight_live_summary ·
--   forecast.target_weight_live_outcome · forecast.target_weight_live_weight (이 순서, 참조 방향).
-- 쓰기는 salt-forecast 만, 서버는 뷰만 읽는다(db-contract.md §1 · §2).

-- ① 리밸런스 날 목표 비중 — 계산 즉시 한 번 쓴다. recorded_at 이 등록 [live] recorded 의 late 판정 근거
CREATE TABLE forecast.target_weight_live_weight (
  prereg_key    text             NOT NULL REFERENCES forecast.preregistration(key),
  universe      text             NOT NULL CHECK (universe IN ('core')),
  target        double precision NOT NULL CHECK (target > 0 AND target <= 1),
  rebalance_at  timestamptz      NOT NULL,          -- 월요일 00:00 UTC 에 마감한 봉
  weights       jsonb            NOT NULL,          -- {"KRW-BTC": 0.18, ...}
  sigma         jsonb            NOT NULL,          -- 계산에 쓴 연 σ
  exposure      double precision NOT NULL CHECK (exposure >= 0 AND exposure <= 1),
  recorded_at   timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (prereg_key, universe, target, rebalance_at)
);
CREATE TRIGGER target_weight_live_weight_no_update BEFORE UPDATE ON forecast.target_weight_live_weight
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- ② 한 주 결과 — t+7 봉 마감 뒤 한 번. late · missing_bar 도 행은 남기고 성적에서만 뺀다
CREATE TABLE forecast.target_weight_live_outcome (
  prereg_key         text             NOT NULL,
  universe           text             NOT NULL,
  target             double precision NOT NULL,
  rebalance_at       timestamptz      NOT NULL,
  week_end           timestamptz      NOT NULL,
  status             text             NOT NULL CHECK (status IN ('ok', 'late', 'missing_bar')),
  returns            jsonb            NOT NULL,     -- 종목별 주간 단순수익. missing_bar 면 빠진 종목은 키가 없다
  strategy_log_return double precision,             -- 비용 차감. missing_bar 면 NULL
  btc_log_return     double precision,
  cost               double precision,
  recorded_at        timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (prereg_key, universe, target, rebalance_at),
  FOREIGN KEY (prereg_key, universe, target, rebalance_at)
    REFERENCES forecast.target_weight_live_weight (prereg_key, universe, target, rebalance_at),
  CHECK (status = 'missing_bar' OR (strategy_log_return IS NOT NULL AND btc_log_return IS NOT NULL))
);
CREATE TRIGGER target_weight_live_outcome_no_update BEFORE UPDATE ON forecast.target_weight_live_outcome
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- ③ 라이브 성적 요약 — 매일 다시 계산해 as_of(마지막 결과 주 끝, 결과가 없으면 첫 리밸런스)로 쌓는다.
-- 원장(①②)에서 결정적으로 나오는 값이라 같은 as_of 는 덮어도 된다. 서버가 요청 때 집계하지 않게 미리 둔다
CREATE TABLE forecast.target_weight_live_summary (
  prereg_key      text             NOT NULL REFERENCES forecast.preregistration(key),
  universe        text             NOT NULL,
  target          double precision NOT NULL,
  as_of           timestamptz      NOT NULL,
  first_rebalance_at timestamptz   NOT NULL,
  n_weeks         integer          NOT NULL CHECK (n_weeks >= 0),   -- status = ok 인 주
  n_excluded      integer          NOT NULL CHECK (n_excluded >= 0), -- late + missing_bar
  cum_return      double precision,
  btc_cum_return  double precision,
  mdd             double precision CHECK (mdd >= 0),   -- 양수 크기
  btc_mdd         double precision CHECK (btc_mdd >= 0),
  vol             double precision,
  upside          double precision,
  downside        double precision,
  worst_weeks     jsonb            NOT NULL,           -- [{rebalance_at, strategy, btc, exposure}] 하위 3
  computed_at     timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (prereg_key, universe, target, as_of)
);

-- 서버가 읽는 계약: 등록 키 · 묶음 · 목표별 최신 한 행
CREATE VIEW forecast.v_target_weight_live AS
SELECT DISTINCT ON (prereg_key, universe, target)
  prereg_key, universe, target, as_of, first_rebalance_at, n_weeks, n_excluded,
  cum_return, btc_cum_return, mdd, btc_mdd, vol, upside, downside, worst_weeks
FROM forecast.target_weight_live_summary
ORDER BY prereg_key, universe, target, as_of DESC;
