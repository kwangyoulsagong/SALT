-- 옛 public."InvestmentNotification" → notification.notification (`SRV-REQ-048` FR-5 · `DB-REQ-036` 부록 notification, 서버 S2c 2026-11-06).
-- **관리자(DB 소유자)가 돌린다** — Flyway 는 svc_notification 으로 돌아 public 을 읽을 권한이 없다.
--
--   psql -v ON_ERROR_STOP=1 -f db/notification-import.sql
--
-- 순서: platform 이 한 번 떠서 Flyway V1 이 notification 표를 만든 뒤 → 이 스크립트 → BFF 가 알림 경로를 platform 으로 → Express 배포(옛 표 drop).
-- - 옮기는 것: 지금 종류 `signal_update` · 코드가 있는 행만(옛 종류 · 문장만 있는 행은 화면에 안 나오던 것 — 옮기지 않는다)
-- - INSERT 만 · 다시 돌려도 같은 결과(ON CONFLICT DO NOTHING) · 인자는 payload.params 중 문자열 값만(옛 Express 읽기와 같다)
-- - 날짜: Prisma DateTime 은 UTC 를 tz 없이 담는다 → UTC 로 읽는다
-- - 옮긴 행은 사용자가 투자 알림을 켜야 보인다(기본 꺼짐 — 판단은 슬라이스 MONEY-S2c)
-- - 끝에 대조: 옮길 행 수 = notification 에 있는 같은 id 수. 어긋나면 예외 → 전부 롤백
BEGIN;

INSERT INTO notification.notification (id, user_id, kind, source, symbol, message_code, params, is_read, created_at, expires_at, source_event_id)
SELECT n.id,
       n."userId",
       'signal_update',
       coalesce(n.source, 'ai_coach'),
       n.symbol,
       n."messageCode",
       coalesce((SELECT jsonb_object_agg(e.key, e.value)
                   FROM jsonb_each(CASE WHEN jsonb_typeof(n.payload::jsonb -> 'params') = 'object' THEN n.payload::jsonb -> 'params' ELSE '{}'::jsonb END) e
                  WHERE jsonb_typeof(e.value) = 'string'), '{}'::jsonb),
       n."isRead",
       n."createdAt" AT TIME ZONE 'UTC',
       n."expiresAt" AT TIME ZONE 'UTC',
       NULL
  FROM public."InvestmentNotification" n
 WHERE n.type = 'signal_update' AND n."messageCode" IS NOT NULL
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    expected bigint;
    moved bigint;
BEGIN
    SELECT count(*) INTO expected FROM public."InvestmentNotification" WHERE type = 'signal_update' AND "messageCode" IS NOT NULL;
    SELECT count(*) INTO moved FROM notification.notification t
     WHERE t.id IN (SELECT id FROM public."InvestmentNotification" WHERE type = 'signal_update' AND "messageCode" IS NOT NULL);
    IF expected <> moved THEN
        RAISE EXCEPTION '대조 실패: 옮길 행 % · 옮겨진 행 %', expected, moved;
    END IF;
    RAISE NOTICE '알림 대조 통과: %행', moved;
END $$;

COMMIT;
