-- savings-import.sql 되돌리기(관리자). **전환 전에만** 의미가 있다 — 전환 뒤엔 새 서비스에 쓴 기록이 생긴다.
-- 가져온 목표에 구간 발행 기록이 하나라도 있으면(= 새 서비스가 이미 그 목표에 썼다) 멈춘다. projection_issued 는 지울 수 없다(DB-REQ-037 FR-3).
--   psql -v ON_ERROR_STOP=1 -f db/savings-import-rollback.sql
BEGIN;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM savings.projection_issued p JOIN savings.goal g ON g.id = p.goal_id WHERE g.legacy_category IS NOT NULL) THEN
        RAISE EXCEPTION '가져온 목표에 새 서비스 기록이 있다 — 되돌리지 않는다(전환 뒤)';
    END IF;
END $$;
DELETE FROM savings.deposit WHERE goal_id IN (SELECT id FROM savings.goal WHERE legacy_category IS NOT NULL);
DELETE FROM savings.goal WHERE legacy_category IS NOT NULL;
COMMIT;
