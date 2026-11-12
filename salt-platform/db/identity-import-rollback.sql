-- identity-import.sql 되돌리기(관리자). **Express 배포(옛 표 drop) 전에만** 의미가 있다 — 그 뒤엔 옛 표가 없다.
-- 옮긴 뒤 identity 에서 새로 가입한 사용자가 있으면 멈춘다(옛 표에 없는 계정 — 지우면 그 사람 계정이 사라진다).
--   psql -v ON_ERROR_STOP=1 -f db/identity-import-rollback.sql
-- 되돌린 뒤 BFF 라우팅 /auth · /users/profile 을 legacy 로(값 둘).
BEGIN;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM identity.users n WHERE NOT EXISTS (SELECT 1 FROM public.users o WHERE o.id = n.id)) THEN
        RAISE EXCEPTION 'identity 에서 새로 생긴 계정이 있다 — 되돌리지 않는다(전환 뒤)';
    END IF;
END $$;
DELETE FROM identity.invite_code_attempts WHERE id IN (SELECT id FROM public.invite_code_attempts);
DELETE FROM identity.invite_codes WHERE id IN (SELECT id FROM public.invite_codes);
DELETE FROM identity.users WHERE id IN (SELECT id FROM public.users);
COMMIT;
