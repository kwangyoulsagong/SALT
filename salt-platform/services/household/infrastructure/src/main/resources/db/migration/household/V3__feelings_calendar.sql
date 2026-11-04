-- 가계부 S1c(2026-11-04, `DB-REQ-038` FR-6 · FR-11 · FR-14) — 감정 태그 · 다음 날 만족 · 무지출 스티커 · 노동시간 설정.
-- 루트 슬라이스 `requirements/specs/in-progress/MONEY-S1c-household-mirror-slice.md` 판단 2~6.

-- 감정 태그(FR-6) — 지출당 하나. **민감 정보**(`FEATURE-015` FR-5): 이벤트 · 로그에 싣지 않는다. 점수 · 평가 열 없음
CREATE TABLE expense_tag (
    expense_id      uuid        PRIMARY KEY REFERENCES expense (id) ON DELETE CASCADE,
    user_id         text        NOT NULL,
    emotion         text        NOT NULL CHECK (emotion IN ('stress', 'reward', 'boredom')),
    -- 산 직후 만족 — 비워도 된다
    felt_now        smallint    CHECK (felt_now BETWEEN 1 AND 5),
    -- 태그를 단 날(KST) — 다음 날부터 7일 동안 한 번 묻는다(판단 2)
    tagged_on       date        NOT NULL,
    felt_next       smallint    CHECK (felt_next BETWEEN 1 AND 5),
    -- 다음 날 답하거나 넘긴 시각. felt_next 가 null 인데 이 값이 있으면 넘김
    next_decided_at timestamptz,
    created_at      timestamptz NOT NULL,
    updated_at      timestamptz NOT NULL,
    CHECK (felt_next IS NULL OR next_decided_at IS NOT NULL)
);

-- 달력 스티커(FR-11) — 사용자가 "안 쓴 날"로 표시한 날. **연속 일수 열 없음**(판단 6). 챌린지 스티커는 S1d 에 kind 를 더한다
CREATE TABLE calendar_sticker (
    user_id    text        NOT NULL,
    sticker_on date        NOT NULL,
    kind       text        NOT NULL CHECK (kind IN ('no_spend')),
    created_at timestamptz NOT NULL
);

-- 가계부 설정(FR-14) — 노동시간 환산(판단 5). 급여는 민감 정보 — 이벤트 · 로그 0. 끄면 값은 남긴다
CREATE TABLE household_setting (
    user_id            text        NOT NULL,
    work_hours_on      boolean     NOT NULL,
    wage_basis         text        CHECK (wage_basis IN ('hourly', 'monthly')),
    wage_amount        numeric     CHECK (wage_amount > 0),
    -- 월급일 때만. null 이면 209(도메인 기본값)
    wage_monthly_hours smallint    CHECK (wage_monthly_hours BETWEEN 1 AND 400),
    updated_at         timestamptz NOT NULL,
    CHECK ((wage_basis IS NULL) = (wage_amount IS NULL)),
    CHECK (NOT work_hours_on OR wage_amount IS NOT NULL),
    CHECK (wage_monthly_hours IS NULL OR wage_basis = 'monthly')
);

-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 키 · 인덱스를 못 읽는다
ALTER TABLE calendar_sticker ADD PRIMARY KEY (user_id, sticker_on, kind);
ALTER TABLE household_setting ADD PRIMARY KEY (user_id);
-- 그 달 태그(목록 · 거울)는 지출과 조인 — 지출 쪽 (user_id, spent_on) 인덱스를 탄다. 다음 날 묻기는 태그 날짜로
CREATE INDEX expense_tag_ask_idx ON expense_tag (user_id, tagged_on) WHERE next_decided_at IS NULL;
-- 민감 정보 표시 — 표 주석으로 남긴다(카탈로그에서 찾을 수 있게)
COMMENT ON TABLE expense_tag IS 'sensitive: emotion and satisfaction (FEATURE-015 FR-5)';
COMMENT ON TABLE household_setting IS 'sensitive: wage (FEATURE-015 FR-5)';
-- [jooq ignore stop]
