-- household 스키마 첫 판(`DB-REQ-036` FR-5 · `DB-REQ-038`, 가계부 S1a 2026-11-04). 스키마 이름을 적지 않는다: Flyway · 연결이 search_path 를 household 로 둔다.
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

-- 지출(`DB-REQ-038` FR-1). **결제 문자 원문을 담는 열은 없다**(FR-13 — 스키마 테스트가 열 이름을 검사한다)
CREATE TABLE expense (
    id                 uuid        PRIMARY KEY,
    user_id            text        NOT NULL,
    amount             numeric     NOT NULL CHECK (amount > 0),
    -- 사용자의 달력 날짜(KST). 월 집계 · 착지 구간이 이 값으로 달을 가른다(저축 deposit.deposited_on 과 같은 뜻)
    spent_on           date        NOT NULL,
    -- 기본 분류 키(도메인 코드 표). CHECK 를 두지 않는다 — 사용자 분류(FR-2, S1b)가 같은 열을 쓴다
    category           text        NOT NULL,
    -- 결제수단 종류만 — 카드사 · 번호 열 없음
    payment_method     text        NOT NULL CHECK (payment_method IN ('card', 'cash', 'transfer', 'other')),
    merchant           text,
    precision          text        NOT NULL CHECK (precision IN ('exact', 'approx')),
    input_kind         text        NOT NULL CHECK (input_kind IN ('quick', 'line', 'paste', 'template', 'approx')),
    -- 할부 개월(2~36). 원거래 = 이 행, 월 청구는 계산값(FR-5 — 리볼빙 표는 S1b)
    installment_months smallint    CHECK (installment_months BETWEEN 2 AND 36),
    memo               text,
    created_at         timestamptz NOT NULL,
    CHECK (precision = 'exact' OR input_kind = 'approx')
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스를 못 읽는다 — 인덱스는 생성 코드에 필요 없다
-- 월 화면 · 착지 표본(FR-12)
CREATE INDEX expense_user_day_idx ON expense (user_id, spent_on);
CREATE INDEX expense_user_category_day_idx ON expense (user_id, category, spent_on);
-- 최근 가맹점 제안 — 가맹점이 있는 행만
CREATE INDEX expense_user_merchant_idx ON expense (user_id, created_at DESC) WHERE merchant IS NOT NULL;
-- [jooq ignore stop]

-- 예산 방식(`DB-REQ-038` FR-3) — 사용자당 하나, "지금 예산"(슬라이스 판단 3). 초과 상태 열 없음(계산값)
CREATE TABLE budget (
    user_id    text        NOT NULL,
    method     text        NOT NULL CHECK (method IN ('50_30_20', 'envelope')),
    -- 50/30/20 의 기준 월 소득(사용자 입력). envelope 이면 null
    income     numeric     CHECK (income > 0),
    updated_at timestamptz NOT NULL,
    CHECK ((method = '50_30_20') = (income IS NOT NULL))
);

-- 봉투 — 50/30/20 이면 묶음 키(needs · wants), envelope 이면 분류 키
CREATE TABLE budget_envelope (
    user_id      text    NOT NULL,
    envelope_key text    NOT NULL,
    amount       numeric NOT NULL CHECK (amount > 0)
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열의 키 · 유일 제약을 못 읽는다 — 키는 생성 코드에 필요 없다(ON CONFLICT 는 실행 SQL 이 쓴다)
ALTER TABLE budget ADD PRIMARY KEY (user_id);
ALTER TABLE budget_envelope ADD PRIMARY KEY (user_id, envelope_key);
ALTER TABLE budget_envelope ADD FOREIGN KEY (user_id) REFERENCES budget (user_id) ON DELETE CASCADE;
-- [jooq ignore stop]

-- 월말 착지 구간 발행 기록(`DB-REQ-038` FR-8) — 불변. "지난달 같은 날짜 적중"과 채점(FC-REQ-024)이 이 행을 본다.
-- 지출을 적은 날 하루 한 번(슬라이스 판단 2) — (user, month, issued_on) 유일, 쓰는 쪽은 ON CONFLICT DO NOTHING
CREATE TABLE landing_issued (
    id            uuid        PRIMARY KEY,
    user_id       text        NOT NULL,
    -- 그 달 1일
    month         date        NOT NULL,
    issued_on     date        NOT NULL,
    issued_at     timestamptz NOT NULL,
    method        text        NOT NULL CHECK (method IN ('empirical_window', 'month_over')),
    -- 구간을 못 냈으면 둘 다 null + reason
    p_low         numeric,
    p_high        numeric,
    spent_so_far  numeric     NOT NULL,
    reason        text,
    days_of_history integer   NOT NULL,
    CHECK ((p_low IS NULL) = (p_high IS NULL)),
    CHECK (p_low IS NULL OR p_low <= p_high)
);

-- [jooq ignore start] 하루 한 번(text 열 유일 제약은 생성기가 못 읽는다) · 불변 트리거(plpgsql) — 저축 projection_issued 와 같은 꼴
ALTER TABLE landing_issued ADD UNIQUE (user_id, month, issued_on);
CREATE FUNCTION landing_issued_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'landing_issued is append-only (DB-REQ-038 FR-8)';
END;
$$;
CREATE TRIGGER landing_issued_no_update BEFORE UPDATE OR DELETE ON landing_issued
    FOR EACH ROW EXECUTE FUNCTION landing_issued_immutable();
-- [jooq ignore stop]
