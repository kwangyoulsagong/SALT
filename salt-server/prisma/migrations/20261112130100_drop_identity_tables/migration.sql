-- 옛 사용자 · 초대 코드 표 삭제(서버 S3b 2026-11-12, `DB-REQ-040` FR-1). 주인은 identity 스키마(Kotlin Flyway V2)다.
--
-- **먼저 할 일**: platform(Flyway V2) 기동 → 관리자 `salt-platform/db/identity-import.sql`(행 대조) → BFF /auth · /users/profile 을 platform 으로.
-- 덤프: pg_dump -Fc -t public.users -t public.invite_codes -t public.invite_code_attempts(복원 시험 1회 — 경로는 커밋 본문).
--
-- 지키는 것: 옛 표에 행이 있는데 identity 에 같은 id 가 다 있지 않으면 **멈춘다**(가져오기 전에 배포해 계정이 사라지지 않게).
-- 빈 DB(새 개발 · 시험 DB)는 옛 행이 0 이라 그대로 지나간다.
DO $$
DECLARE
    missing bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM public.users) THEN
        IF to_regclass('identity.users') IS NULL THEN
            RAISE EXCEPTION 'identity.users 가 없다 — platform(Flyway V2) 과 identity-import.sql 을 먼저';
        END IF;
        EXECUTE 'SELECT count(*) FROM public.users o WHERE NOT EXISTS (SELECT 1 FROM identity.users n WHERE n.id = o.id)' INTO missing;
        IF missing > 0 THEN
            RAISE EXCEPTION 'identity 로 안 옮긴 계정 %개 — identity-import.sql 을 먼저', missing;
        END IF;
        EXECUTE 'SELECT count(*) FROM public.invite_codes o WHERE NOT EXISTS (SELECT 1 FROM identity.invite_codes n WHERE n.id = o.id)' INTO missing;
        IF missing > 0 THEN
            RAISE EXCEPTION 'identity 로 안 옮긴 초대 코드 %개 — identity-import.sql 을 먼저', missing;
        END IF;
    END IF;
END $$;

-- invite_codes → users FK 가 있어 코드 표부터
DROP TABLE "invite_code_attempts";
DROP TABLE "invite_codes";
DROP TABLE "users";
