-- identity 스키마 첫 판(`DB-REQ-040` FR-2 · `SRV-REQ-048` FR-1 · 2, 서버 S3a 2026-11-06). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 identity 로 둔다.
-- 사용자 · 초대 코드 표(`DB-REQ-040` FR-1)는 아직 public(Express auth) — S3b 에 옮긴다. 그래서 user_id 는 FK 없는 열이다(`DB-REQ-036` 부록 B1).
-- 앞의 세 표(outbox · processed_event · shedlock)는 모든 서비스 스키마에 같은 모양(services/ping 그대로) — support/messaging 이 이 이름으로 쓴다.
-- 아웃박스(`SRV-REQ-044` FR-1). 업무 행과 같은 트랜잭션에 쓰고 릴레이가 보낸 뒤 published_at 을 채운다. S3a 는 발행 0(UserRegistered 는 S3b)
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

-- 셸 설정 — 사용자 하나에 한 행. 행 없음 = 아직 안 골랐다(기본 순서 · 숨김 0).
-- 도메인 목록은 쉼표로 이은 키(`savings,invest`) — 순서 · 집합 규칙은 도메인(`ShellPrefs`)이 지키고 DB 는 모양만 막는다.
-- 금액 · 개인 식별 열 0(user_id 는 identity 의 키)
CREATE TABLE user_domain_pref (
    user_id         varchar(128) PRIMARY KEY,
    -- 고른 도메인(모으기 · 쓰는 돈 · 투자). null = 안 골랐다
    chosen_domains  varchar(64),
    chosen_at       timestamptz,
    -- 온보딩 끝(첫 입력으로 넘어감 · 나중에 하기). null = 안 끝남
    onboarded_at    timestamptz,
    -- 저장한 홈 배치. null = 저장한 적 없음(기본값은 서버 도메인이 만든다)
    card_order      varchar(64),
    hidden_cards    varchar(64),
    updated_at      timestamptz  NOT NULL
);
-- [jooq ignore start] 모양 검사 — 생성기가 정규식 연산자를 못 읽는다
ALTER TABLE user_domain_pref ADD CONSTRAINT user_domain_pref_chosen_shape
    CHECK (chosen_domains IS NULL OR chosen_domains ~ '^(savings|household|invest)(,(savings|household|invest))*$');
ALTER TABLE user_domain_pref ADD CONSTRAINT user_domain_pref_order_shape
    CHECK (card_order IS NULL OR card_order ~ '^(savings|household|invest|tips)(,(savings|household|invest|tips)){3}$');
ALTER TABLE user_domain_pref ADD CONSTRAINT user_domain_pref_hidden_shape
    CHECK (hidden_cards IS NULL OR hidden_cards ~ '^((savings|household|invest|tips)(,(savings|household|invest|tips)){0,2})?$');
ALTER TABLE user_domain_pref ADD CONSTRAINT user_domain_pref_layout_pair
    CHECK ((card_order IS NULL) = (hidden_cards IS NULL));
ALTER TABLE user_domain_pref ADD CONSTRAINT user_domain_pref_onboarded_after_choice
    CHECK (onboarded_at IS NULL OR chosen_domains IS NOT NULL);
-- [jooq ignore stop]
