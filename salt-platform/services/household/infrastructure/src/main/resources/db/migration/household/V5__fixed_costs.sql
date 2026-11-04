-- 가계부 S1e(2026-11-04, `DB-REQ-038` FR-15 · FR-16) — 고정비 찾기 · 고정비 증가 발행.
-- 루트 슬라이스 `requirements/specs/done/MONEY-S1e-household-fixed-cost-slice.md` 판단 1~6.
-- 후보 자체는 저장하지 않는다 — 지출에서 그때그때 계산한다(판단 2). 여기 두 표는 사용자가 정한 것 · 한 번만 낼 것뿐이다.

-- "고정비 아니에요"(FR-15) — 가맹점 키(공백 지우고 소문자) 하나. 숨긴 키는 후보 · 증가 발행 둘 다에서 빠진다
CREATE TABLE fixed_cost_hidden (
    user_id      text        NOT NULL,
    merchant_key text        NOT NULL CHECK (length(merchant_key) BETWEEN 1 AND 40),
    hidden_at    timestamptz NOT NULL
);

-- 고정비 증가 발행 기록(FR-16) — 가맹점 · 달마다 한 번(`ON CONFLICT DO NOTHING` 이 넣었을 때만 `FixedCostIncreased`).
-- 지출을 지워도 남는다(이미 나간 사건). 가맹점 키는 이 서비스 안에서만 — 이벤트 본문에는 분류만 싣는다(판단 5)
CREATE TABLE fixed_cost_increase (
    id           uuid        PRIMARY KEY,
    user_id      text        NOT NULL,
    merchant_key text        NOT NULL,
    -- 그 달 1일
    month        date        NOT NULL,
    expense_id   uuid        NOT NULL,
    category     text        NOT NULL,
    previous     numeric     NOT NULL CHECK (previous > 0),
    current      numeric     NOT NULL CHECK (current > previous),
    detected_at  timestamptz NOT NULL
);

-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 키 · 유일 제약을 못 읽는다
ALTER TABLE fixed_cost_hidden ADD PRIMARY KEY (user_id, merchant_key);
ALTER TABLE fixed_cost_increase ADD UNIQUE (user_id, merchant_key, month);
-- 후보 표본 — 가맹점이 있는 정확한 직접 입력만(템플릿 · 대략 제외). 기존 (user_id, spent_on) 으로도 되지만 행을 덜 읽는다
CREATE INDEX expense_user_merchant_day_idx ON expense (user_id, spent_on)
    WHERE merchant IS NOT NULL AND precision = 'exact' AND input_kind <> 'template';
-- [jooq ignore stop]
