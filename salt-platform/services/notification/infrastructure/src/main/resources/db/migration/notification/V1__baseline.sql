-- notification 스키마 첫 판(`SRV-REQ-048` FR-5 · `DB-REQ-036` 부록 notification · `DB-REQ-040` FR-3 정정 — 설정 주인은 notification, 서버 S2c 2026-11-06). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 notification 으로 둔다.
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

-- 알림(옛 public."InvestmentNotification" → 이름 notification). 문장 · 금액 열 0 — 코드와 코드 인자(params)만.
-- id 는 text: 옮겨 온 옛 행은 cuid, 새 행은 UUID 문자열. source_event_id = 만든 이벤트(옮겨 온 행은 null)
CREATE TABLE notification (
    id              varchar(64)  PRIMARY KEY,
    user_id         varchar(128) NOT NULL,
    kind            varchar(32)  NOT NULL,
    source          varchar(32)  NOT NULL,
    symbol          varchar(32),
    message_code    varchar(64)  NOT NULL,
    params          jsonb        NOT NULL,
    is_read         boolean      NOT NULL DEFAULT false,
    created_at      timestamptz  NOT NULL,
    expires_at      timestamptz,
    source_event_id uuid         UNIQUE
);
-- [jooq ignore start]
CREATE INDEX notification_user_idx ON notification (user_id, created_at DESC);
CREATE INDEX notification_expires_idx ON notification (expires_at) WHERE expires_at IS NOT NULL;
ALTER TABLE notification ADD CONSTRAINT notification_kind_known CHECK (kind IN ('signal_update', 'goal_reached', 'fixed_cost_increased'));
ALTER TABLE notification ADD CONSTRAINT notification_code_format CHECK (message_code ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$');
ALTER TABLE notification ADD CONSTRAINT notification_params_object CHECK (jsonb_typeof(params) = 'object');
-- [jooq ignore stop]

-- 도메인별 켬/끔. **행이 없으면 꺼짐**(기본 꺼짐)
CREATE TABLE notification_pref (
    user_id    varchar(128) NOT NULL,
    domain     varchar(16)  NOT NULL,
    enabled    boolean      NOT NULL,
    updated_at timestamptz  NOT NULL,
    PRIMARY KEY (user_id, domain)
);
-- [jooq ignore start]
ALTER TABLE notification_pref ADD CONSTRAINT notification_pref_domain_known CHECK (domain IN ('invest', 'savings', 'household'));
-- [jooq ignore stop]
