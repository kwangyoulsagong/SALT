-- 가계부 S1d(2026-11-04, `DB-REQ-037` FR-2 · `SRV-REQ-045` FR-17) — 챌린지 "아낀 돈"을 목표에 보탠 적립의 출처.
-- 루트 슬라이스 `requirements/specs/done/MONEY-S1d-household-challenge-slice.md` 판단 4: 같은 아낀 돈은 한 번만 적립된다(재시도해도 하나).
-- 가계부의 id 를 담을 뿐 가계부 스키마를 가리키지 않는다(FK 없음 — 서비스 간 조인 0, `msa-services.md` §5).
ALTER TABLE deposit ADD COLUMN source_ref uuid;
ALTER TABLE deposit ADD CONSTRAINT deposit_source_ref_kind CHECK (source_ref IS NULL OR source = 'saved_by_challenge');
-- 출처 없는 행은 NULL 이라 서로 부딪히지 않는다
CREATE UNIQUE INDEX deposit_source_ref_key ON deposit (source_ref);
