-- F010 슬라이스 1 (2026-09-29) — 예측 원장 + 규칙 IC. DB-REQ-017 FR-62 · DB-REQ-029 FR-19.
-- 추가만. 롤백 = DROP TRIGGER · DROP FUNCTION · DROP TABLE 셋(서로 참조 없음).

-- ① public.judgment_ledger — 서버가 매일 발행하는 코치 규칙 판단(종목 × 모드 × UTC 날 1행).
-- symbol_judgment_snapshots 는 관찰 기간당 1건(성적표 표본)이고, 이건 **매일 전부**다(IC 표본).
-- 판정(outcome)은 저장하지 않는다 — 라벨은 읽는 쪽(salt-forecast)이 가격으로 만든다(슬라이스 0 회고 Action).
-- 재료마다 발생 시각(observedAt)을 jsonb 에, 판단 시각(decided_at)과 행이 쓰인 시각(created_at)을 열에 둔다.
CREATE TABLE "judgment_ledger" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL,
    "rule_version" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "materials" JSONB NOT NULL,
    "missing_data" TEXT[] NOT NULL,
    "regime" TEXT NOT NULL,
    "entry_price" DECIMAL(65,30) NOT NULL,
    "entry_observed_at" TIMESTAMP(3),
    "sample_origin" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judgment_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "judgment_ledger_mode_check" CHECK ("mode" IN ('scalp', 'long_term')),
    CONSTRAINT "judgment_ledger_sample_origin_check" CHECK ("sample_origin" IN ('live', 'backtest', 'synthetic'))
);
CREATE UNIQUE INDEX "judgment_ledger_symbol_mode_as_of_date_key" ON "judgment_ledger"("symbol", "mode", "as_of_date");
CREATE INDEX "judgment_ledger_as_of_date_idx" ON "judgment_ledger"("as_of_date");

-- 불변 — 발행한 판단을 고치지 않는다. 틀린 발행은 새 rule_version 으로 다음 날부터 바뀐다
-- 두 표(원장 · 사전등록)가 같이 쓴다 — 열 이름에 기대지 않고 표 이름으로 알린다
CREATE FUNCTION judgment_ledger_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%.% 는 불변이다', TG_TABLE_SCHEMA, TG_TABLE_NAME;
END $$;
CREATE TRIGGER judgment_ledger_no_update BEFORE UPDATE ON "judgment_ledger"
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- ② forecast.preregistration — 사전등록(salt-forecast 만 쓴다). 같은 key 는 한 번만, 고치지 않는다
CREATE TABLE forecast.preregistration (
  key            text        PRIMARY KEY,
  registered_at  timestamptz NOT NULL,          -- 파일의 registered(결과 계산 전)
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  git_sha        text        NOT NULL,
  content_sha256 text        NOT NULL,          -- 파일 원문 해시 — 같은 key 로 다른 내용이 오면 작업이 실패한다
  spec           jsonb       NOT NULL
);
CREATE TRIGGER preregistration_no_update BEFORE UPDATE ON forecast.preregistration
  FOR EACH ROW EXECUTE FUNCTION judgment_ledger_immutable();

-- ③ forecast.rule_ic — 규칙 항목별 IC. 실행(run_as_of)마다 쌓는다(덮지 않음 — 판정 이력)
CREATE TABLE forecast.rule_ic (
  prereg_key     text             NOT NULL REFERENCES forecast.preregistration(key),
  run_as_of      timestamptz      NOT NULL,
  source         text             NOT NULL CHECK (source IN ('backtest', 'live')),
  item           text             NOT NULL,
  mode           text             NOT NULL CHECK (mode IN ('scalp', 'long_term', 'market', 'any')),  -- any = 모드와 무관한 도전자 신호
  horizon_days   integer          NOT NULL CHECK (horizon_days > 0),
  label_kind     text             NOT NULL CHECK (label_kind IN ('fixed', 'barrier')),
  regime         text             NOT NULL,        -- 'all' | 'btc_above_200d' | 'btc_below_200d'
  ic_kind        text             NOT NULL CHECK (ic_kind IN ('cross_section', 'time_series')),
  window_start   date             NOT NULL,
  window_end     date             NOT NULL,
  n_dates        integer          NOT NULL,
  mean_obs       double precision,
  ic_mean        double precision,
  ci_low         double precision,
  ci_high        double precision,
  t_naive        double precision,
  verdict        text             NOT NULL CHECK (verdict IN ('keep', 'reverse', 'zero_weight', 'insufficient')),
  is_primary     boolean          NOT NULL,
  computed_at    timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (prereg_key, run_as_of, source, item, mode, horizon_days, label_kind, regime)
);
