-- savings 스키마 첫 판(`DB-REQ-036` FR-5 · `DB-REQ-037`). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 savings 로 둔다.
-- 앞의 세 표(outbox · processed_event · shedlock)는 모든 서비스 스키마에 같은 모양(services/ping 그대로) — support/messaging 이 이 이름으로 쓴다.
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

-- 목표(`DB-REQ-037` FR-1) — 옛 public.goals 를 옮긴 자리. 금액 열은 NUMERIC 그대로(Prisma Decimal = numeric(65,30)) — 이동 중 타입 변경 0
CREATE TABLE goal (
    id               uuid        PRIMARY KEY,
    user_id          text        NOT NULL,
    title            text        NOT NULL,
    template         text        NOT NULL CHECK (template IN ('wedding', 'housing', 'first_car', 'travel', 'emergency', 'childbirth', 'other')),
    -- 옛 GoalCategory 원래 값(가져온 행만) — 창업 · 창작이 기타로 접혀도 되돌릴 수 있게
    legacy_category  text,
    target_amount    numeric     NOT NULL CHECK (target_amount > 0),
    target_date      date,
    monthly_plan     numeric     CHECK (monthly_plan > 0),
    include_interest boolean     NOT NULL DEFAULT false,
    -- 사용자가 넣은 연 이율(%, 세전). include_interest 가 false 면 null
    annual_rate      numeric     CHECK (annual_rate >= 0 AND annual_rate <= 30),
    -- 모이는 장면 종류(S1b — FEATURE-012 FR-15). 지금은 null
    scene_kind       text,
    status           text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    -- 옛 themeColor — 화면이 아직 쓰지 않지만 사용자가 고른 값이라 버리지 않는다
    theme_color      text,
    created_at       timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL,
    completed_at     timestamptz,
    archived_at      timestamptz,
    CHECK (target_date IS NOT NULL OR monthly_plan IS NOT NULL),
    CHECK (include_interest OR annual_rate IS NULL)
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스를 못 읽는다 — 인덱스는 생성 코드에 필요 없다
-- 사용자별 목록(FR-10)
CREATE INDEX goal_user_idx ON goal (user_id, archived_at);
-- [jooq ignore stop]

-- 적립(`DB-REQ-037` FR-2) — 옛 saving_transactions. 실제 적립과 챌린지 "아낀 돈"을 source 로 가른다
CREATE TABLE deposit (
    id             uuid        PRIMARY KEY,
    goal_id        uuid        NOT NULL REFERENCES goal (id),
    user_id        text        NOT NULL,
    amount         numeric     NOT NULL CHECK (amount > 0),
    -- 사용자의 달력 날짜(KST). 월 집계 · 이정표가 이 값으로 달을 가른다
    deposited_on   date        NOT NULL,
    note           text,
    split_group_id uuid,
    source         text        NOT NULL CHECK (source IN ('manual', 'saved_by_challenge', 'imported_balance')),
    created_at     timestamptz NOT NULL
);
CREATE INDEX deposit_goal_day_idx ON deposit (goal_id, deposited_on);
-- [jooq ignore start]
CREATE INDEX deposit_user_idx ON deposit (user_id, goal_id);
-- [jooq ignore stop]

-- 도달 구간 발행 기록(`DB-REQ-037` FR-3) — 불변. 채점(FC-REQ-024)이 "그때 무엇을 말했나"를 이 행으로 본다
CREATE TABLE projection_issued (
    id                uuid        PRIMARY KEY,
    goal_id           uuid        NOT NULL REFERENCES goal (id),
    issued_at         timestamptz NOT NULL,
    method            text        NOT NULL CHECK (method IN ('empirical_quantile', 'plan_only')),
    -- 달 구간 — 그 달 1일로 적는다. late 가 null 이면 늦은 쪽이 열림(reason)
    p_low_date        date,
    p_high_date       date,
    plan_date         date,
    reason            text,
    months_of_history integer     NOT NULL
);
CREATE INDEX projection_goal_issued_idx ON projection_issued (goal_id, issued_at DESC);

-- [jooq ignore start] 생성기가 plpgsql 을 못 읽는다. 원장 차단 트리거와 같은 꼴(판정 원장 · DB-REQ-036 "옮겨도 남는다")
CREATE FUNCTION projection_issued_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'projection_issued is append-only (DB-REQ-037 FR-3)';
END;
$$;
CREATE TRIGGER projection_issued_no_update BEFORE UPDATE OR DELETE ON projection_issued
    FOR EACH ROW EXECUTE FUNCTION projection_issued_immutable();
-- [jooq ignore stop]
