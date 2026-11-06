-- coach 스키마 첫 판 — **아웃박스만**(`SRV-REQ-048` FR-5 · `SRV-REQ-044` FR-1, 서버 S2c 2026-11-06). coach 는 S6 까지 Express(public 표)지만, 판단 변화를
-- 이벤트(coach.DecisionChanged)로 내보내려고 발행 창구를 먼저 세운다: Express 가 이 표에 행을 쓰고 플랫폼 릴레이(svc_coach)가 보낸다. 업무 표는 S6(`SRV-REQ-049` FR-4) 에 V2 부터.
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

