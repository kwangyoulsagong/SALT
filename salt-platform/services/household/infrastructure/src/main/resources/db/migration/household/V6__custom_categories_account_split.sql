-- 가계부 S1f(2026-11-05, `DB-REQ-038` FR-2 · FR-3 · FR-17) — 사용자 분류 · 통장 쪼개기 이름표.
-- 루트 슬라이스 `requirements/specs/done/MONEY-S1f-household-categories-accounts-slice.md` 판단 1~4.

-- 사용자 분류(FR-17 신설 — FR-2 의 "사용자 분류" 칸). 키는 `u_` + 12자리 난수 — 지출 `expense.category` 가 이 키를 그대로 담는다(V1 이 CHECK 를 두지 않은 이유).
-- 지우기는 보관(`archived_at`) — 그 키로 적은 지난 지출 · 봉투 · 템플릿이 이름 그대로 보이게 행을 남긴다
CREATE TABLE custom_category (
    id          uuid        PRIMARY KEY,
    user_id     text        NOT NULL,
    category    text        NOT NULL,
    name        text        NOT NULL CHECK (length(name) BETWEEN 1 AND 12),
    bucket      text        NOT NULL CHECK (bucket IN ('needs', 'wants')),
    archived_at timestamptz,
    created_at  timestamptz NOT NULL
);

-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 유일 · 표현식 · 부분 인덱스를 못 읽는다
ALTER TABLE custom_category ADD UNIQUE (user_id, category);
ALTER TABLE custom_category ADD CHECK (category ~ '^u_[0-9a-f]{12}$');
-- 같은 이름은 보관하지 않은 것끼리만 막는다 — 보관한 "간식"이 있어도 새 "간식"을 만들 수 있다. 넣는 쪽은 ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX custom_category_active_name_uq ON custom_category (user_id, lower(name)) WHERE archived_at IS NULL;

-- 통장 쪼개기(FR-3 `account_split`) — 소득이 있는 방식이 둘이 된다. 봉투 행은 통장 키(spending · saving · emergency), 급여 통장 몫은 계산값
ALTER TABLE budget DROP CONSTRAINT budget_method_check;
ALTER TABLE budget ADD CONSTRAINT budget_method_check CHECK (method IN ('50_30_20', 'envelope', 'account_split'));
ALTER TABLE budget DROP CONSTRAINT budget_check;
ALTER TABLE budget ADD CONSTRAINT budget_check CHECK ((method IN ('50_30_20', 'account_split')) = (income IS NOT NULL));

-- 월 마감 예산 사본(FR-7)도 같은 방식을 담는다
ALTER TABLE month_close DROP CONSTRAINT month_close_budget_method_check;
ALTER TABLE month_close ADD CONSTRAINT month_close_budget_method_check CHECK (budget_method IN ('50_30_20', 'envelope', 'account_split'));
ALTER TABLE month_close DROP CONSTRAINT month_close_check;
ALTER TABLE month_close ADD CONSTRAINT month_close_check CHECK (budget_income IS NULL OR budget_method IN ('50_30_20', 'account_split'));
-- [jooq ignore stop]
