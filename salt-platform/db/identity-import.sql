-- 옛 public.users · invite_codes · invite_code_attempts → identity 같은 이름 표(`DB-REQ-040` FR-1 · `SRV-REQ-048` FR-8, 서버 S3b 2026-11-12).
-- **관리자(DB 소유자)가 돌린다** — Flyway 는 svc_identity 로 돌아 public 을 읽을 권한이 없다.
--
--   psql -v ON_ERROR_STOP=1 -f db/identity-import.sql
--
-- 순서: platform 이 한 번 떠서 Flyway V2 가 identity 표를 만든 뒤 → 이 스크립트 → BFF 가 /auth · /users/profile 을 platform 으로
--       → Express 배포(Prisma 마이그레이션이 FK 18개를 끊고 옛 표 셋을 지운다 — 그 전에 이 대조가 통과해야 한다).
-- - INSERT 만 · 다시 돌려도 같은 결과(ON CONFLICT DO NOTHING)
-- - 날짜: Prisma DateTime 은 UTC 를 tz 없이 담는다 → UTC 로 읽는다
-- - 비밀번호 해시는 글자 그대로(bcrypt — Kotlin 쪽 검증기가 같은 해시를 읽는다)
-- - 끝에 대조: 표마다 옛 행 수 = identity 에 있는 같은 id 수 · 이메일 · 해시 · 코드 사용자가 같은지. 어긋나면 예외 → 전부 롤백
BEGIN;

INSERT INTO identity.users (id, email, nickname, password_hash, profile_image_url, total_points, user_level, created_at, updated_at, last_login_at)
SELECT u.id, u.email, u.nickname, u.password_hash, u.profile_image_url, u.total_points, u.user_level,
       u.created_at AT TIME ZONE 'UTC', u.updated_at AT TIME ZONE 'UTC', u.last_login_at AT TIME ZONE 'UTC'
  FROM public.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.invite_codes (id, code, expires_at, used_by_user_id, used_at, note, created_at)
SELECT c.id, c.code, c.expires_at AT TIME ZONE 'UTC', c.used_by_user_id, c.used_at AT TIME ZONE 'UTC', c.note, c.created_at AT TIME ZONE 'UTC'
  FROM public.invite_codes c
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.invite_code_attempts (id, code_prefix, reason_code, client_key, created_at)
SELECT a.id, a.code_prefix, a.reason_code, a.client_key, a.created_at AT TIME ZONE 'UTC'
  FROM public.invite_code_attempts a
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    old_users bigint; moved_users bigint;
    old_codes bigint; moved_codes bigint;
    old_attempts bigint; moved_attempts bigint;
BEGIN
    SELECT count(*) INTO old_users FROM public.users;
    -- 같은 id 에 이메일 · 해시 · 생성 시각까지 같아야 센다 — 먼저 있던 다른 행을 옮긴 것으로 세지 않는다
    SELECT count(*) INTO moved_users FROM public.users o JOIN identity.users n
        ON n.id = o.id AND n.email = o.email AND n.password_hash = o.password_hash AND n.created_at = o.created_at AT TIME ZONE 'UTC';
    SELECT count(*) INTO old_codes FROM public.invite_codes;
    SELECT count(*) INTO moved_codes FROM public.invite_codes o JOIN identity.invite_codes n
        ON n.id = o.id AND n.code = o.code AND n.used_by_user_id IS NOT DISTINCT FROM o.used_by_user_id;
    SELECT count(*) INTO old_attempts FROM public.invite_code_attempts;
    SELECT count(*) INTO moved_attempts FROM public.invite_code_attempts o JOIN identity.invite_code_attempts n ON n.id = o.id;
    IF old_users <> moved_users OR old_codes <> moved_codes OR old_attempts <> moved_attempts THEN
        RAISE EXCEPTION '대조 실패: 사용자 %/% · 코드 %/% · 시도 %/%', moved_users, old_users, moved_codes, old_codes, moved_attempts, old_attempts;
    END IF;
    RAISE NOTICE 'identity 대조 통과: 사용자 % · 코드 % · 시도 %', moved_users, moved_codes, moved_attempts;
END $$;

COMMIT;
