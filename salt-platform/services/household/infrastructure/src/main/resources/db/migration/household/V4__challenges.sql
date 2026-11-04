-- 가계부 S1d(2026-11-04, `DB-REQ-038` FR-10 · FR-11) — 내가 고르는 챌린지 · "한 날" 스티커 · 아낀 돈.
-- 루트 슬라이스 `requirements/specs/done/MONEY-S1d-household-challenge-slice.md` 판단 1~5.

-- 챌린지(FR-10) — 사용자가 이름 · 기간을 고른다. 상태는 진행 · 끝 둘뿐 — **실패 상태 없음**(수용 기준). 그만둔 날을 남긴다
CREATE TABLE challenge (
    id         uuid        PRIMARY KEY,
    user_id    text        NOT NULL,
    title      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 40),
    starts_on  date        NOT NULL,
    ends_on    date        NOT NULL,
    status     text        NOT NULL CHECK (status IN ('active', 'ended')),
    ended_on   date,
    created_at timestamptz NOT NULL,
    CHECK (ends_on >= starts_on),
    CHECK ((status = 'ended') = (ended_on IS NOT NULL))
);

-- "한 날" 스티커(FR-11) — 어느 챌린지의 어느 날인지. 연속 일수 열 없음. 스펙의 `calendar_sticker` kind 대신 따로 둔다(판단 3)
CREATE TABLE challenge_day (
    challenge_id uuid        NOT NULL REFERENCES challenge (id),
    user_id      text        NOT NULL,
    marked_on    date        NOT NULL,
    created_at   timestamptz NOT NULL
);

-- 아낀 돈(FR-10 `challenge_saving`) — 실제 적립이 아니다. 목표에 보태면 그 목표 · 시각을 적는다(저축 쪽 적립은 이 id 가 출처, 판단 4)
CREATE TABLE challenge_saving (
    id             uuid        PRIMARY KEY,
    challenge_id   uuid        NOT NULL REFERENCES challenge (id),
    user_id        text        NOT NULL,
    amount         numeric     NOT NULL CHECK (amount > 0),
    saved_on       date        NOT NULL,
    note           text        CHECK (length(note) <= 100),
    goal_id        uuid,
    contributed_at timestamptz,
    created_at     timestamptz NOT NULL,
    CHECK ((goal_id IS NULL) = (contributed_at IS NULL))
);

-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스 · 부분 인덱스를 못 읽는다
ALTER TABLE challenge_day ADD PRIMARY KEY (challenge_id, marked_on);
-- 목록 — 사용자의 최근 챌린지 · 열린 것 세기
CREATE INDEX challenge_user_idx ON challenge (user_id, created_at DESC);
-- 달력 스티커 — 사용자 · 달
CREATE INDEX challenge_day_user_idx ON challenge_day (user_id, marked_on);
CREATE INDEX challenge_saving_challenge_idx ON challenge_saving (challenge_id);
-- [jooq ignore stop]
