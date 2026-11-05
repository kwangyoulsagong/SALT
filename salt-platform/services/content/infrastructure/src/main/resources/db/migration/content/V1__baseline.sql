-- content 스키마 첫 판(`DB-REQ-036` FR-5 · `DB-REQ-039`, 금융 팁 S2a 2026-11-05). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 content 로 둔다.
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

-- 글 메타(`DB-REQ-039` FR-1). 본문은 레포 원문 파일이 주인 — 여기는 메타 · 해시만. 필수 열은 전부 NOT NULL(메타 하나 빠지면 INSERT 실패)
CREATE TABLE tip (
    slug         varchar(64) PRIMARY KEY,
    title        text        NOT NULL CHECK (length(title) > 0),
    source_url   text        NOT NULL CHECK (source_url LIKE 'https://%'),
    source_name  text        NOT NULL CHECK (length(source_name) > 0),
    written_on   date        NOT NULL,
    reviewed_on  date        NOT NULL,
    base_year    smallint    NOT NULL CHECK (base_year BETWEEN 2000 AND 2100),
    valid_until  date        NOT NULL,
    status       text        NOT NULL CHECK (status IN ('published', 'needs_check')),
    content_hash text        NOT NULL CHECK (length(content_hash) = 64),
    updated_at   timestamptz NOT NULL,
    CHECK (reviewed_on >= written_on),
    CHECK (valid_until >= reviewed_on)
);

-- 변경 이력(FR-2 · FR-7) — 공개. 고치지 않고 쌓기만
CREATE TABLE tip_revision (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tip_slug      varchar(64) NOT NULL REFERENCES tip (slug),
    revised_at    timestamptz NOT NULL,
    summary       text        NOT NULL CHECK (length(summary) > 0),
    previous_hash text
);
-- [jooq ignore start]
CREATE INDEX tip_revision_slug_idx ON tip_revision (tip_slug, revised_at);
-- [jooq ignore stop]

-- 제도 파라미터(FR-3) — 키 하나에 유효 구간 여럿. valid_to 는 마지막 유효일(포함), null = 끝 미정. 금액은 NUMERIC 그대로
CREATE TABLE policy_param (
    param_key   varchar(64) NOT NULL,
    valid_from  date    NOT NULL,
    valid_to    date,
    num_value   numeric,
    text_value  text,
    unit        text    NOT NULL,
    source_url  text    NOT NULL CHECK (source_url LIKE 'https://%'),
    as_of       date    NOT NULL,
    PRIMARY KEY (param_key, valid_from),
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CHECK (num_value IS NOT NULL OR text_value IS NOT NULL)
);
-- [jooq ignore start]
-- 생성기(H2 흉내)가 정규식 · 배타 CHECK 를 못 읽는다 — 제약은 여기서 따로
ALTER TABLE tip ADD CONSTRAINT tip_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE policy_param ADD CONSTRAINT policy_param_key_format CHECK (param_key ~ '^[a-z][a-z0-9_]*$');
ALTER TABLE policy_param ADD CONSTRAINT policy_param_one_value CHECK (num_value IS NULL OR text_value IS NULL);
-- [jooq ignore stop]

-- [jooq ignore start]
-- 같은 키 구간 겹침 금지 — FR-3 은 exclusion constraint 를 적었지만 text = 연산에 btree_gist 확장이 필요하고 서비스 계정은 확장을 못 만든다.
-- 트리거로 같은 뜻을 지킨다(쓰기는 원문 동기화 한 곳 · 기동 때 한 번이라 경합이 없다 — 그래도 키 단위 advisory lock 으로 막는다)
CREATE FUNCTION policy_param_no_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    overlapping boolean;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('policy_param:' || NEW.param_key));
    -- 표는 트리거가 걸린 스키마에서 찾는다(TG_TABLE_SCHEMA) — 세션 search_path 가 content 가 아닌 연결(관리자 psql)에서도 같은 검사
    EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM %I.policy_param p WHERE p.param_key = $1 AND p.valid_from <> $2 '
        || 'AND daterange(p.valid_from, p.valid_to, ''[]'') && daterange($2, $3, ''[]''))', TG_TABLE_SCHEMA)
        INTO overlapping USING NEW.param_key, NEW.valid_from, NEW.valid_to;
    IF overlapping THEN
        RAISE EXCEPTION 'policy_param % 구간이 겹친다 (%)', NEW.param_key, NEW.valid_from USING ERRCODE = 'exclusion_violation';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER policy_param_no_overlap BEFORE INSERT OR UPDATE ON policy_param FOR EACH ROW EXECUTE FUNCTION policy_param_no_overlap();
-- [jooq ignore stop]

-- 트리거 규칙(FR-4) — 원문 파일의 triggers · contexts. 원문에서 빠지면 active = false
CREATE TABLE trigger_rule (
    tip_slug   varchar(64) NOT NULL REFERENCES tip (slug),
    kind       varchar(64) NOT NULL,
    contexts   text     NOT NULL,
    sort_order integer  NOT NULL,
    active     boolean  NOT NULL,
    PRIMARY KEY (tip_slug, kind)
);

-- 닫기 기록(FR-5) — 한 번 닫으면 다시 안 띄움
CREATE TABLE tip_dismissal (
    -- 키 열이라 길이를 둔다(생성기가 text 키를 못 읽는다). 사용자 ID 는 cuid 25자
    user_id      varchar(128) NOT NULL,
    tip_slug     varchar(64)  NOT NULL REFERENCES tip (slug),
    dismissed_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, tip_slug)
);

-- 사용자 신호(FR-8, S2a 추가) — 다른 서비스 이벤트에서 온 트리거 사실만. 금액 · 목표 이름 0
CREATE TABLE user_signal (
    event_id    uuid        PRIMARY KEY,
    user_id     text        NOT NULL,
    kind        text        NOT NULL,
    occurred_at timestamptz NOT NULL
);
-- [jooq ignore start]
CREATE INDEX user_signal_user_idx ON user_signal (user_id, occurred_at);
-- [jooq ignore stop]
