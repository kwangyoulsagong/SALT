-- ping 스키마 첫 판(`DB-REQ-036` FR-5 — 서비스별 V1__baseline). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 ping 으로 둔다.
-- 앞의 세 표(outbox · processed_event · shedlock)는 **모든 서비스 스키마에 같은 모양**으로 둔다 — support/messaging 이 이 이름으로 쓴다.

-- 아웃박스(`SRV-REQ-044` FR-1). 업무 행과 같은 트랜잭션에 쓰고 릴레이가 보낸 뒤 published_at 을 채운다
CREATE TABLE outbox (
    event_id     uuid        PRIMARY KEY,
    event_type   text        NOT NULL,
    payload      jsonb       NOT NULL,
    trace_parent text,
    occurred_at  timestamptz NOT NULL,
    published_at timestamptz,
    attempts     integer     NOT NULL DEFAULT 0
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스 · 부분 인덱스를 못 읽는다 — 인덱스는 생성 코드에 필요 없다
CREATE INDEX outbox_pending_idx ON outbox (occurred_at) WHERE published_at IS NULL;
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

CREATE TABLE ping_check (
    id         uuid        PRIMARY KEY,
    user_id    text        NOT NULL,
    checked_at timestamptz NOT NULL
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스 · 부분 인덱스를 못 읽는다 — 인덱스는 생성 코드에 필요 없다
CREATE INDEX ping_check_user_idx ON ping_check (user_id);
-- [jooq ignore stop]

CREATE TABLE ping_echo (
    check_id    uuid        PRIMARY KEY REFERENCES ping_check (id),
    trace_id    text,
    received_at timestamptz NOT NULL
);
