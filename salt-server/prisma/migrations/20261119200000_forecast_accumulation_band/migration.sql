-- DB-REQ-013 개정(2026-11-19, 예측 FC-REQ-029 · 사전등록 band-accumulation@2, 루트 F003-v2-band-accumulation-global-plan.md 순서 1) — 밸류에이션 밴드 적립.
-- 추가만(표 하나 · 뷰 하나). 쓰기는 salt-forecast 만(db-contract.md §1), 서버 plan 은 뷰만 읽는다. 원화 금액 0 — 금액은 서버(공통 수용 기준 3).
-- 롤백: DROP VIEW forecast.v_accumulation_band; DROP TABLE forecast.accumulation_band;

-- 자산 × 이번 주 결정일(월요일 00:00 UTC) × 사전등록 키 한 행 — 같은 주 재실행은 덮어쓴다
CREATE TABLE forecast.accumulation_band (
  asset            text        NOT NULL CHECK (asset IN ('btc', 'kospi')),
  plan_week        timestamptz NOT NULL,
  prereg_key       text        NOT NULL,
  indicator        text        NOT NULL CHECK (indicator IN ('mvrv_z', 'per_percentile')),
  indicator_value  double precision,                     -- BTC MVRV Z · 코스피 PER 추정 — null = 이번 주 값 없음(stale_inputs)
  percentile       double precision CHECK (percentile IS NULL OR (percentile >= 0 AND percentile <= 1)),
  estimated        boolean     NOT NULL,                 -- 코스피 월 사이 추정(지난달 PER × 지수 비율)
  basis_observed   timestamptz,                          -- 근거 관측(BTC 관측일 · 코스피 PER 달 1일)
  secondary_value  double precision,                     -- 코스피 배당수익률(표시만)
  band_key         text        CHECK (band_key IS NULL OR band_key IN ('extreme_low', 'low', 'neutral', 'high', 'extreme_high')),
  band_multiplier  double precision,                     -- 밴드가 말한 배수(관문과 무관)
  gate_passed      boolean     NOT NULL,
  blocked_reason   text        CHECK (blocked_reason IS NULL OR blocked_reason IN ('insufficient_sample', 'not_better_than_flat', 'stale_inputs')),
  multiplier       double precision NOT NULL CHECK (multiplier >= 0 AND multiplier <= 3),  -- 화면 배수 — 관문 실패면 1.0
  closed_weeks     integer     NOT NULL,                 -- 검산 표본(52주 라벨이 닫힌 결정 주)
  excess           double precision,                     -- 배수 가중 52주 수익률 − 정액 평균(비율, 0.115 = +11.5%p)
  ci_low           double precision,
  ci_high          double precision,
  years_total      integer     NOT NULL,
  years_positive   integer     NOT NULL,
  window_from      timestamptz,
  window_to        timestamptz,
  failure_cases    jsonb       NOT NULL,                 -- [{decidedAt, kind, band, multiplier, return52w}] |r| 큰 순 3건
  failure_count    integer     NOT NULL,
  kimchi_premium   double precision,                     -- BTC 만 — 업비트 ÷ (바이낸스 × 원/달러) − 1
  kimchi_as_of     timestamptz,
  computed_at      timestamptz NOT NULL,
  PRIMARY KEY (asset, plan_week, prereg_key),
  CHECK (gate_passed = (blocked_reason IS NULL)),
  CHECK (gate_passed OR multiplier = 1.0)                -- 관문을 못 지나면 정액
);

-- 서버 plan 이 읽는 계약 — 자산마다 가장 최근 결정일 한 행(같은 주에 키가 둘이면 나중에 계산한 것)
CREATE VIEW forecast.v_accumulation_band AS
SELECT DISTINCT ON (asset)
       asset, plan_week, prereg_key, indicator, indicator_value, percentile, estimated, basis_observed, secondary_value,
       band_key, band_multiplier, gate_passed, blocked_reason, multiplier, closed_weeks, excess, ci_low, ci_high,
       years_total, years_positive, window_from, window_to, failure_cases, failure_count, kimchi_premium, kimchi_as_of, computed_at
FROM forecast.accumulation_band
ORDER BY asset, plan_week DESC, computed_at DESC;
