-- 가계부 S1h(2026-11-05, `DB-REQ-038` FR-5 · FR-9 · FR-19 신설) — 리볼빙 명세서 · 사람 장부 · 해 경조사 봉투.
-- 루트 슬라이스 `requirements/specs/done/MONEY-S1h-household-revolving-people-slice.md` 판단 1~6.

-- 리볼빙(FR-5) — 사용자가 적은 명세서 한 장. 월 청구 · 수수료는 계산(저장 안 함). 할부는 지출 열(`installment_months`)이라 따로 둔다
CREATE TABLE revolving_plan (
    id              uuid         PRIMARY KEY,
    user_id         text         NOT NULL,
    label           text         CHECK (length(label) BETWEEN 1 AND 20),
    balance         numeric      NOT NULL CHECK (balance > 0),
    pay_ratio       smallint     NOT NULL CHECK (pay_ratio BETWEEN 10 AND 100),
    annual_rate     numeric(4,2) NOT NULL CHECK (annual_rate > 0 AND annual_rate <= 20),
    statement_month date         NOT NULL,
    ended_on        date,
    created_at      timestamptz  NOT NULL,
    updated_at      timestamptz  NOT NULL
);

-- 사람 장부(FR-9) — 상대 이름은 사용자 입력. **민감 정보** — 이벤트 · 로그 · 이야기 카드에 나가지 않는다
CREATE TABLE person_entry (
    id          uuid        PRIMARY KEY,
    user_id     text        NOT NULL,
    person      text        NOT NULL CHECK (length(person) BETWEEN 1 AND 20),
    direction   text        NOT NULL CHECK (direction IN ('gave', 'received')),
    amount      numeric     NOT NULL CHECK (amount > 0),
    occasion    text        NOT NULL CHECK (occasion IN ('wedding', 'funeral', 'first_birthday', 'birthday', 'housewarming', 'holiday', 'other')),
    happened_on date        NOT NULL,
    memo        text        CHECK (length(memo) <= 100),
    created_at  timestamptz NOT NULL
);

-- 해 경조사 봉투(FR-19 신설) — 달마다 오지 않는 돈이라 한 해 금액. 남은 금액 = 봉투 − 그해 준 합(계산)
CREATE TABLE occasion_envelope (
    user_id    text        NOT NULL,
    for_year   smallint    NOT NULL CHECK (for_year BETWEEN 2000 AND 2100),
    amount     numeric     NOT NULL CHECK (amount > 0),
    updated_at timestamptz NOT NULL
);

-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 키 · 인덱스 · 표현식 CHECK 를 못 읽는다
ALTER TABLE occasion_envelope ADD PRIMARY KEY (user_id, for_year);
-- 명세서 달은 달의 첫날로만 — 띠 계산이 달 단위다
ALTER TABLE revolving_plan ADD CHECK (extract(day FROM statement_month) = 1);
COMMENT ON TABLE revolving_plan IS 'financial: revolving statement entered by the user (no events, no logs)';
COMMENT ON TABLE person_entry IS 'sensitive: person names and gift amounts (FEATURE-015 FR-5)';
-- 월 띠 · 관리 화면 — 사용자의 명세서
CREATE INDEX revolving_plan_user_idx ON revolving_plan (user_id, statement_month);
-- 해 목록 · 해 봉투 합 — 사용자 · 날짜
CREATE INDEX person_entry_user_day_idx ON person_entry (user_id, happened_on);
-- 한 사람 목록 · 사람별 합
CREATE INDEX person_entry_user_person_idx ON person_entry (user_id, person);
-- [jooq ignore stop]
