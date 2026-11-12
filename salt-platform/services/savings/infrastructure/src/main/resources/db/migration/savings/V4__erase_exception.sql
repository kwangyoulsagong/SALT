-- 계정 삭제 예외 하나(`SRV-REQ-048` FR-4 · `DB-REQ-040` FR-4, 서버 S3c 2026-11-12).
-- 발행 원장은 덧붙이기만이다(`DB-REQ-037` FR-3) — 고치기 · 지우기를 막는다. 계정을 지울 때만 그 사람 행을 지울 수 있다:
-- 지우는 트랜잭션이 `SET LOCAL salt.erase = 'on'`(`support/persistence` `UserRows.erase` 한 곳)을 켰을 때의 DELETE. 고치기(UPDATE)는 그때도 막는다.
-- [jooq ignore start] 생성기가 plpgsql 을 못 읽는다
CREATE OR REPLACE FUNCTION projection_issued_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('salt.erase', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'projection_issued is append-only (DB-REQ-037 FR-3)';
END;
$$;
-- [jooq ignore stop]
