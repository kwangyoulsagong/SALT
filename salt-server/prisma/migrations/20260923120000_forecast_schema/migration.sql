-- DB-REQ-029 (F008 슬라이스 16) — forecast 스키마.
-- 쓰기 주인은 salt-forecast(Python). salt-server 는 v_forecast_card 뷰만 읽는다.
-- Prisma 모델이 없는 SQL 전용 마이그레이션이다 — schema.prisma 의 schemas 밖이라 드리프트로 보지 않는다.

CREATE SCHEMA IF NOT EXISTS forecast;

CREATE TABLE forecast.job_run (
    id           BIGSERIAL PRIMARY KEY,
    job          TEXT        NOT NULL,
    args         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ,
    ok           BOOLEAN,
    rows         INTEGER,
    error        TEXT
);
CREATE INDEX job_run_job_started_idx ON forecast.job_run (job, started_at DESC);

CREATE TABLE forecast.source_status (
    source           TEXT PRIMARY KEY,
    last_success_at  TIMESTAMPTZ,
    last_failure_at  TIMESTAMPTZ,
    last_error       TEXT
);

-- 시세 봉. available_at = 봉 마감(이 시각 전에는 종가를 알 수 없다).
CREATE TABLE forecast.price_bar (
    source        TEXT        NOT NULL,
    symbol        TEXT        NOT NULL,
    interval      TEXT        NOT NULL,
    open_time     TIMESTAMPTZ NOT NULL,
    close_time    TIMESTAMPTZ NOT NULL,
    available_at  TIMESTAMPTZ NOT NULL,
    open          NUMERIC     NOT NULL,
    high          NUMERIC     NOT NULL,
    low           NUMERIC     NOT NULL,
    close         NUMERIC     NOT NULL,
    volume        NUMERIC,
    ingested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (source, symbol, interval, open_time)
);
CREATE INDEX price_bar_symbol_available_idx ON forecast.price_bar (symbol, interval, available_at);

CREATE TABLE forecast.model (
    model_version  TEXT PRIMARY KEY,
    name           TEXT        NOT NULL,
    params         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 분위수는 로그수익률. 가격 · 원화 환산은 서버가 base_close 로 한다.
CREATE TABLE forecast.prediction (
    symbol         TEXT             NOT NULL,
    horizon_weeks  SMALLINT         NOT NULL CHECK (horizon_weeks BETWEEN 1 AND 4),
    as_of          TIMESTAMPTZ      NOT NULL,
    model_version  TEXT             NOT NULL REFERENCES forecast.model (model_version),
    kind           TEXT             NOT NULL CHECK (kind IN ('backtest', 'live')),
    base_close     NUMERIC          NOT NULL,
    q05            DOUBLE PRECISION NOT NULL,
    q10            DOUBLE PRECISION NOT NULL,
    q25            DOUBLE PRECISION NOT NULL,
    q50            DOUBLE PRECISION NOT NULL,
    q75            DOUBLE PRECISION NOT NULL,
    q90            DOUBLE PRECISION NOT NULL,
    q95            DOUBLE PRECISION NOT NULL,
    p_up           DOUBLE PRECISION NOT NULL CHECK (p_up BETWEEN 0 AND 1),
    direction      TEXT             NOT NULL CHECK (direction IN ('up', 'down', 'abstain')),
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    PRIMARY KEY (symbol, horizon_weeks, as_of, model_version),
    CHECK (q05 <= q10 AND q10 <= q25 AND q25 <= q50 AND q50 <= q75 AND q75 <= q90 AND q90 <= q95)
);
CREATE INDEX prediction_symbol_h_asof_idx ON forecast.prediction (symbol, horizon_weeks, as_of DESC);

CREATE TABLE forecast.score (
    symbol         TEXT             NOT NULL,
    horizon_weeks  SMALLINT         NOT NULL,
    as_of          TIMESTAMPTZ      NOT NULL,
    model_version  TEXT             NOT NULL,
    kind           TEXT             NOT NULL CHECK (kind IN ('backtest', 'live')),
    realized       DOUBLE PRECISION NOT NULL,
    hit90          BOOLEAN          NOT NULL,
    hit80          BOOLEAN          NOT NULL,
    width90        DOUBLE PRECISION NOT NULL,
    pinball        DOUBLE PRECISION NOT NULL,
    direction      TEXT             NOT NULL,
    direction_hit  BOOLEAN,
    scored_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    PRIMARY KEY (symbol, horizon_weeks, as_of, model_version),
    FOREIGN KEY (symbol, horizon_weeks, as_of, model_version)
        REFERENCES forecast.prediction (symbol, horizon_weeks, as_of, model_version) ON DELETE CASCADE
);
CREATE INDEX score_model_h_asof_idx ON forecast.score (model_version, horizon_weeks, as_of);

-- 종목 × 기간의 최신 판정. 적중률은 폭 · 기준 폭 · 판정 수와 한 행에 있다(FEATURE-008 FR-10).
CREATE TABLE forecast.gate (
    symbol               TEXT             NOT NULL,
    horizon_weeks        SMALLINT         NOT NULL,
    model_version        TEXT             NOT NULL,
    baseline_version     TEXT             NOT NULL,
    evaluated_at         TIMESTAMPTZ      NOT NULL,
    renderable           BOOLEAN          NOT NULL,
    blocked_reason       TEXT,
    score_kind           TEXT             NOT NULL CHECK (score_kind IN ('backtest', 'live')),
    sample               INTEGER          NOT NULL,
    coverage90           DOUBLE PRECISION,
    width90              DOUBLE PRECISION,
    baseline_width90     DOUBLE PRECISION,
    pinball_skill        DOUBLE PRECISION,
    direction_calls      INTEGER          NOT NULL DEFAULT 0,
    direction_hits       INTEGER          NOT NULL DEFAULT 0,
    always_up_rate       DOUBLE PRECISION,
    PRIMARY KEY (symbol, horizon_weeks)
);

CREATE VIEW forecast.v_forecast_card AS
SELECT
    g.symbol,
    g.horizon_weeks,
    p.as_of,
    g.model_version,
    p.base_close,
    p.q05, p.q10, p.q25, p.q50, p.q75, p.q90, p.q95,
    p.p_up,
    p.direction,
    g.renderable AND p.as_of IS NOT NULL AS renderable,
    CASE WHEN p.as_of IS NULL THEN 'no_live_prediction' ELSE g.blocked_reason END AS blocked_reason,
    g.score_kind,
    g.sample,
    g.coverage90,
    g.width90,
    g.baseline_width90,
    g.pinball_skill,
    g.direction_calls,
    g.direction_hits,
    g.always_up_rate,
    g.evaluated_at,
    COALESCE(m.misses, '[]'::jsonb) AS recent_misses
FROM forecast.gate g
LEFT JOIN LATERAL (
    SELECT * FROM forecast.prediction pr
    WHERE pr.symbol = g.symbol AND pr.horizon_weeks = g.horizon_weeks
      AND pr.model_version = g.model_version AND pr.kind = 'live'
    ORDER BY pr.as_of DESC LIMIT 1
) p ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
               'asOf', s.as_of, 'realized', s.realized, 'q05', pr.q05, 'q95', pr.q95)
           ORDER BY s.as_of DESC) AS misses
    FROM (
        SELECT * FROM forecast.score s0
        WHERE s0.symbol = g.symbol AND s0.horizon_weeks = g.horizon_weeks
          AND s0.model_version = g.model_version AND NOT s0.hit90
        ORDER BY s0.as_of DESC LIMIT 3
    ) s
    JOIN forecast.prediction pr USING (symbol, horizon_weeks, as_of, model_version)
) m ON TRUE;
