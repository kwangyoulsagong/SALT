-- portfolio 스키마 첫 판(`DB-REQ-036` FR-5 — 서비스별 V1__baseline). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 portfolio 로 둔다.
-- 앞의 세 표(outbox · processed_event · shedlock)는 **모든 서비스 스키마에 같은 모양**으로 둔다 — support/messaging 이 이 이름으로 쓴다.

-- 아웃박스(`SRV-REQ-044` FR-1). 업무 행과 같은 트랜잭션에 쓰고 릴레이가 보낸 뒤 published_at 을 채운다
CREATE TABLE outbox (
    -- 쓴 순서. 릴레이가 이 순서로 보낸다(occurred_at 은 한 트랜잭션 안에서 같을 수 있다)
    seq          bigint      GENERATED ALWAYS AS IDENTITY UNIQUE,
    event_id     uuid        PRIMARY KEY,
    event_type   text        NOT NULL,
    payload      jsonb       NOT NULL,
    trace_parent text,
    occurred_at  timestamptz NOT NULL,
    published_at timestamptz,
    attempts     integer     NOT NULL DEFAULT 0,
    -- 릴레이가 maxAttempts 번 실패하고 포기한 시각 — 운영 점검 대상(지표 salt.outbox.dead)
    dead_at      timestamptz
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스 · 부분 인덱스를 못 읽는다 — 인덱스는 생성 코드에 필요 없다
CREATE INDEX outbox_pending_idx ON outbox (seq) WHERE published_at IS NULL AND dead_at IS NULL;
-- [jooq ignore stop]

-- 구독자 멱등(FR-2)
CREATE TABLE processed_event (
    event_id     uuid        PRIMARY KEY,
    event_type   text        NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
);

-- ShedLock(`SRV-REQ-043` FR-8) — 릴레이 · 스케줄 작업이 인스턴스 하나에서만
CREATE TABLE shedlock (
    name       varchar(64)  PRIMARY KEY,
    lock_until timestamptz  NOT NULL,
    locked_at  timestamptz  NOT NULL,
    locked_by  varchar(255) NOT NULL
);

-- ── 밴드 적립(plan) — S4a(`SRV-REQ-049` FR-1 · `DB-REQ-036` 부록 portfolio, 2026-11-26) 에 public(Prisma `20261119300100_plan_weekly`)에서 옮겼다.
-- 열 · 제약 · 등급 주석이 옛 표와 같다. 바뀐 것: 시각 열 timestamptz(옛 TIMESTAMP(3) 은 UTC 값 — 가져오기가 `AT TIME ZONE 'UTC'`) · updated_at 기본값.
-- 롤백: DROP TABLE weekly_plan_executions; DROP TABLE plan_settings; (데이터는 `db/portfolio-plan-import-rollback.sql` 로 public 에 되돌린다)

CREATE TABLE plan_settings (
    id                        text        NOT NULL,
    user_id                   text        NOT NULL,
    -- 사용자가 마지막에 넣은 월 적립액(원, 1,000원 단위 정수)
    monthly_base_krw          numeric(20,0) NOT NULL,
    -- effective_week 전 주들에 쓰는 값 — 첫 저장이면 null
    previous_monthly_base_krw numeric(20,0),
    -- monthly_base_krw 가 쓰이기 시작하는 주(KST 월요일)
    effective_week            date        NOT NULL,
    -- 첫 저장 주(KST 월요일) — 이 주부터 마감 · 미실행을 센다
    started_week              date        NOT NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE weekly_plan_executions (
    id              text          NOT NULL,
    user_id         text          NOT NULL,
    week_of         date          NOT NULL,
    -- btc | kospi
    asset           text          NOT NULL CHECK (asset IN ('btc', 'kospi')),
    weekly_base_krw numeric(20,0) NOT NULL,
    multiplier      numeric(6,3)  NOT NULL CHECK (multiplier >= 0 AND multiplier <= 3),
    planned_krw     numeric(20,0) NOT NULL,
    -- 예측 밴드(관문과 무관) — 그 주 예측 행이 없으면 null
    band_key        text,
    gate_passed     boolean,
    blocked_reason  text,
    prereg_key      text,
    indicator_value double precision,
    -- 그 주 예측 행이 없어 정액(1.0)으로 둔 주
    fallback        boolean       NOT NULL DEFAULT false,
    -- planned | executed | skipped
    status          text          NOT NULL DEFAULT 'planned',
    executed_krw    numeric(20,0),
    -- 수동 체크 시각(원장 매칭 없음 — ADR-002)
    recorded_at     timestamptz,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    CHECK (weekly_base_krw >= 0 AND planned_krw >= 0 AND (executed_krw IS NULL OR executed_krw >= 0)),
    -- 상태와 값은 한 덩어리 — executed 면 금액 · 시각이 있고, 아니면 없다
    CHECK (
        (status = 'executed' AND executed_krw IS NOT NULL AND recorded_at IS NOT NULL)
        OR (status IN ('planned', 'skipped') AND executed_krw IS NULL AND recorded_at IS NULL)
    )
);

-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 기본 키 · 유니크 · 인덱스 · 나머지 연산 · ISODOW 를 못 읽는다 — 생성 코드에 필요 없다
ALTER TABLE plan_settings ADD CONSTRAINT plan_settings_pkey PRIMARY KEY (id);
ALTER TABLE weekly_plan_executions ADD CONSTRAINT weekly_plan_executions_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX plan_settings_user_id_key ON plan_settings (user_id);
-- 월 적립액은 1,000원 단위 양수(상 · 하한은 서버 설정값 — 여기는 모양만)
ALTER TABLE plan_settings ADD CONSTRAINT plan_settings_monthly_unit CHECK (monthly_base_krw > 0 AND monthly_base_krw % 1000 = 0);
ALTER TABLE plan_settings ADD CONSTRAINT plan_settings_previous_unit
    CHECK (previous_monthly_base_krw IS NULL OR (previous_monthly_base_krw > 0 AND previous_monthly_base_krw % 1000 = 0));
-- KST 월요일(ISO 요일 1)
ALTER TABLE plan_settings ADD CONSTRAINT plan_settings_weeks_monday
    CHECK (EXTRACT(ISODOW FROM effective_week) = 1 AND EXTRACT(ISODOW FROM started_week) = 1);

CREATE UNIQUE INDEX weekly_plan_executions_user_id_week_of_asset_key ON weekly_plan_executions (user_id, week_of, asset);
CREATE INDEX weekly_plan_executions_user_id_week_of_idx ON weekly_plan_executions (user_id, week_of DESC);
ALTER TABLE weekly_plan_executions ADD CONSTRAINT weekly_plan_executions_week_monday CHECK (EXTRACT(ISODOW FROM week_of) = 1);
-- [jooq ignore stop]

-- 내 데이터 등급(서버 S3d — 설명이 설정 화면에 그대로 나온다). 옛 public 표 주석과 같은 글자
COMMENT ON TABLE plan_settings IS 'financial: 밸류에이션 밴드 적립 월 적립액';
COMMENT ON TABLE weekly_plan_executions IS 'financial: 주마다 적립 계획 금액 · 배수 · 직접 체크한 실행 금액';
