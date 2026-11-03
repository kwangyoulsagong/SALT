-- 실물 단위(`DB-REQ-037` FR-5 · `SRV-REQ-045` FR-16, S1b 2026-11-03) — "제주 왕복 120,000원" 같은 단위로 모은 돈을 바꿔 본다.
-- 사용자 단위(user_id + goal_id)만 지금 쓴다. 템플릿 단위(template + source + as_of)는 출처를 대조한 값이 생기면 — 둘 중 하나는 꼭 갖춘다.
-- 도장(FR-6) · 엽서(FR-7)는 표를 만들지 않는다 — 적립 · 목표에서 바로 센다(엽서 사진 열이 필요해지면 그때 표를).
CREATE TABLE item_unit (
    id         uuid        PRIMARY KEY,
    user_id    text,
    goal_id    uuid        REFERENCES goal (id),
    template   text        CHECK (template IN ('wedding', 'housing', 'first_car', 'travel', 'emergency', 'childbirth', 'other')),
    name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
    unit_price numeric     NOT NULL CHECK (unit_price > 0),
    source     text,
    as_of      date,
    created_at timestamptz NOT NULL,
    CHECK ((user_id IS NOT NULL AND goal_id IS NOT NULL AND template IS NULL)
        OR (user_id IS NULL AND goal_id IS NULL AND template IS NOT NULL AND source IS NOT NULL AND as_of IS NOT NULL))
);
-- [jooq ignore start] 코드 생성(H2 흉내)이 text 열 인덱스를 못 읽는다
-- 목록 한 번에 사용자 단위 전부 · 목표 하나의 단위(앞 열 user_id 로 둘 다)
CREATE INDEX item_unit_user_goal_idx ON item_unit (user_id, goal_id, created_at);
-- [jooq ignore stop]
