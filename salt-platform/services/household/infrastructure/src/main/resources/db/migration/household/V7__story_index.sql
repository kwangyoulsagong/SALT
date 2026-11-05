-- 가계부 S1g(2026-11-05, `DB-REQ-038` FR-18 신설) — 이야기 카드. 새 표 0: 카드는 기록을 읽어 계산만 한다(저장 0).
-- 루트 슬라이스 `requirements/specs/done/MONEY-S1g-household-story-slice.md` 판단 3.

-- 기간 안 아낀 돈 합 — 챌린지 화면은 챌린지 id 로 읽어 이 인덱스가 없었다(V4). 해 카드가 사용자 · 날짜 범위로 읽는다
-- [jooq ignore start]
CREATE INDEX challenge_saving_user_day_idx ON challenge_saving (user_id, saved_on);
-- [jooq ignore stop]
