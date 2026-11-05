-- 금융 팁 S2b(`DB-REQ-039` FR-6 · FR-2 보강, 2026-11-05) — 퀴즈 기록 · 변경 이력 줄.
-- 목적 하나씩이 원칙이지만 둘 다 "더하기만"(drop · 이름 변경 0)이라 한 파일. 되돌리기는 표 drop · 열 drop 둘.

-- 변경 이력에 그 판의 줄(FR-7 줄 diff 재료). 줄은 개행으로 잇는다 — 줄 안엔 개행이 없다(문단은 한 줄로 편다).
-- S2b 전 행은 NULL — 그 판과의 diff 는 모른다(화면은 요약 한 줄만)
ALTER TABLE tip_revision ADD COLUMN body_lines text;

-- 퀴즈 기록(FR-6) — 사람 · 글 하나에 한 행. 처음 맞힌 시각(correct_at)이 카드다 — 한 번 생기면 지우지 않는다
CREATE TABLE quiz_answer (
    -- 키 열이라 길이를 둔다(생성기가 text 키를 못 읽는다, tip_dismissal 과 같다)
    user_id           varchar(128) NOT NULL,
    tip_slug          varchar(64)  NOT NULL REFERENCES tip (slug),
    attempts          integer      NOT NULL CHECK (attempts > 0),
    first_answered_at timestamptz  NOT NULL,
    last_answered_at  timestamptz  NOT NULL,
    correct_at        timestamptz,
    PRIMARY KEY (user_id, tip_slug),
    CHECK (last_answered_at >= first_answered_at),
    CHECK (correct_at IS NULL OR correct_at BETWEEN first_answered_at AND last_answered_at)
);
-- [jooq ignore start]
-- 모음 화면 — 이 사람이 맞힌 것만 최근 먼저
CREATE INDEX quiz_answer_collected_idx ON quiz_answer (user_id, correct_at DESC) WHERE correct_at IS NOT NULL;
-- [jooq ignore stop]
