-- 가계부 S1b(2026-11-04, `DB-REQ-038` FR-4 · FR-7 · FR-12) — 반복 템플릿 · 예정 행 · 월 마감 · 할부 인덱스 · 착지 발행의 예정 몫.
-- 루트 슬라이스 `requirements/specs/in-progress/MONEY-S1b-household-month-slice.md` 판단 1~8.

-- 반복 템플릿(FR-4). 주기는 매달 하나(판단 1) — day_of_month 가 짧은 달을 넘으면 그 달 말일
CREATE TABLE recurring_template (
    id               uuid        PRIMARY KEY,
    user_id          text        NOT NULL,
    name             text        NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
    amount           numeric     NOT NULL CHECK (amount > 0),
    category         text        NOT NULL,
    payment_method   text        NOT NULL CHECK (payment_method IN ('card', 'cash', 'transfer', 'other')),
    day_of_month     smallint    NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    -- true 면 "이번 달에도 나갔나요?" 확인 뒤에야 지출이 된다. false 면 워커가 예정일에 적는다(판단 3)
    confirm_required boolean     NOT NULL,
    -- 이 달(1일)부터 예정 행을 만든다 — 만든 날 이미 지난 예정일이면 다음 달(판단 2)
    starts_month     date        NOT NULL,
    -- 끝낸 템플릿은 남긴다(확인한 예정 행 · 지출이 가리킨다). null 이면 살아 있다
    ended_at         timestamptz,
    created_at       timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL
);

-- 예정 행 — 템플릿 · 달마다 하나. 확인하면 그 지출을 가리킨다. 금액 · 이름 · 분류는 그 달 값(템플릿을 고쳐도 확인한 달은 그대로)
CREATE TABLE recurring_occurrence (
    id          uuid        PRIMARY KEY,
    template_id uuid        NOT NULL REFERENCES recurring_template (id),
    user_id     text        NOT NULL,
    -- 그 달 1일
    month       date        NOT NULL,
    due_on      date        NOT NULL,
    name        text        NOT NULL,
    amount      numeric     NOT NULL CHECK (amount > 0),
    category    text        NOT NULL,
    status      text        NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'skipped')),
    -- FK 동작은 기본(막음) — 지출을 지우는 유스케이스가 먼저 이 행을 "예정"으로 되돌린다(판단 5)
    expense_id  uuid        REFERENCES expense (id),
    decided_at  timestamptz,
    created_at  timestamptz NOT NULL,
    CHECK ((status = 'confirmed') = (expense_id IS NOT NULL)),
    CHECK ((status = 'scheduled') = (decided_at IS NULL))
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스 · 부분 인덱스를 못 읽는다
-- 달마다 하나 — 워커는 ON CONFLICT DO NOTHING(판단 2)
ALTER TABLE recurring_occurrence ADD UNIQUE (template_id, month);
-- 월 화면 · 착지의 예정 합(FR-12 — 스펙의 `recurring_occurrence(due_on)` 대신 사용자 · 달로 찾는다)
CREATE INDEX recurring_occurrence_user_month_idx ON recurring_occurrence (user_id, month);
-- 워커 — 확인 필요 없는 예정 행 중 예정일이 온 것
CREATE INDEX recurring_occurrence_due_idx ON recurring_occurrence (due_on) WHERE status = 'scheduled';
-- 지출 지우기가 이어진 예정 행을 찾는다
CREATE INDEX recurring_occurrence_expense_idx ON recurring_occurrence (expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX recurring_template_user_idx ON recurring_template (user_id) WHERE ended_at IS NULL;
-- 할부 띠(FR-10) — 할부 행만
CREATE INDEX expense_user_installment_idx ON expense (user_id, spent_on) WHERE installment_months IS NOT NULL;
-- [jooq ignore stop]

-- 월 마감(FR-7) — 리뷰 3문항 답(비워도 된다) · 평가 점수 열 없음. 그달 예산 사본(판단 6): 닫을 때 한 번 붙잡는다
CREATE TABLE month_close (
    id                uuid        PRIMARY KEY,
    user_id           text        NOT NULL,
    -- 그 달 1일
    month             date        NOT NULL,
    answer_satisfied  text        CHECK (length(answer_satisfied) <= 300),
    answer_try_next   text        CHECK (length(answer_try_next) <= 300),
    answer_known_next text        CHECK (length(answer_known_next) <= 300),
    -- 예산이 없던 달이면 null
    budget_method     text        CHECK (budget_method IN ('50_30_20', 'envelope')),
    budget_income     numeric     CHECK (budget_income > 0),
    closed_at         timestamptz NOT NULL,
    updated_at        timestamptz NOT NULL,
    CHECK (budget_income IS NULL OR budget_method = '50_30_20')
);

CREATE TABLE month_close_envelope (
    close_id     uuid    NOT NULL REFERENCES month_close (id) ON DELETE CASCADE,
    envelope_key text    NOT NULL,
    amount       numeric NOT NULL CHECK (amount > 0)
);
-- [jooq ignore start] text 열 유일 · 키는 생성기가 못 읽는다
ALTER TABLE month_close ADD UNIQUE (user_id, month);
ALTER TABLE month_close_envelope ADD PRIMARY KEY (close_id, envelope_key);
-- [jooq ignore stop]

-- 착지 발행에 예정 몫(판단 4) — 지난 발행은 예정 개념이 없던 때라 0
ALTER TABLE landing_issued ADD COLUMN scheduled numeric NOT NULL DEFAULT 0;
