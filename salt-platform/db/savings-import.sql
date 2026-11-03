-- 옛 public.goals · saving_transactions → savings.goal · deposit (`DB-REQ-037` FR-1 · 2 · 11, 슬라이스 MONEY-S1a 판단 2).
-- **관리자(DB 소유자)가 돌린다** — Flyway 는 svc_savings 로 돌아 public 을 읽을 권한이 없다(그게 S0 의 요점).
--
--   psql -v ON_ERROR_STOP=1 -f db/savings-import.sql
--
-- 순서: platform 이 한 번 떠서 Flyway V1 이 savings 표를 만든 뒤 → 이 스크립트 → BFF 가 저축 경로를 platform 으로(같은 날).
-- - INSERT 만 · 다시 돌려도 같은 결과(ON CONFLICT DO NOTHING, 잔액 행 id 는 목표 id 에서 만든다) — 전환 직전 다시 돌리면 그 사이 옛 경로로 생긴 행도 옮긴다
-- - 금액 열은 손대지 않는다(NUMERIC → NUMERIC). 날짜: Prisma DateTime 은 UTC 를 tz 없이 담는다 → UTC 로 읽어 KST 달력 날짜로
-- - 옛 행은 지우지 않는다 — Express 코드 · Prisma 모델 삭제(msa-services §7 ⑦)와 같이
-- - 끝에 대조: 옮긴 목표 수 · 목표마다 적립 합 = 옛 current_amount. 어긋나면 예외 → 전부 롤백
BEGIN;

INSERT INTO savings.goal (id, user_id, title, template, legacy_category, target_amount, target_date, monthly_plan,
                          include_interest, status, theme_color, created_at, updated_at, completed_at)
SELECT g.id::uuid,
       g.user_id,
       g.title,
       CASE g.category::text WHEN 'travel' THEN 'travel' WHEN 'first_car' THEN 'first_car' WHEN 'wedding' THEN 'wedding' ELSE 'other' END,
       g.category::text,
       g."targetAmount",  -- Prisma 필드에 @map 이 없어 열 이름이 camelCase 다
       ((g.target_date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date,
       NULL,
       false,
       g.status::text,
       g.theme_color,
       g.created_at AT TIME ZONE 'UTC',
       g.updated_at AT TIME ZONE 'UTC',
       g.completed_at AT TIME ZONE 'UTC'
  FROM public.goals g
ON CONFLICT (id) DO NOTHING;

INSERT INTO savings.deposit (id, goal_id, user_id, amount, deposited_on, note, split_group_id, source, created_at)
SELECT t.id::uuid,
       t.goal_id::uuid,
       t.user_id,
       t.amount,
       ((t.transaction_date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date,
       t.note,
       NULL,
       'manual',
       t.created_at AT TIME ZONE 'UTC'
  FROM public.saving_transactions t
ON CONFLICT (id) DO NOTHING;

-- 옛 current_amount 중 거래 기록이 없는 몫 — 새 서비스는 적립 합이 곧 모은 돈이라 한 행으로 남긴다(시작일에)
INSERT INTO savings.deposit (id, goal_id, user_id, amount, deposited_on, note, split_group_id, source, created_at)
SELECT md5('imported_balance:' || g.id)::uuid,
       g.id::uuid,
       g.user_id,
       g.current_amount - COALESCE(s.total, 0),
       ((g.start_date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date,
       NULL,
       NULL,
       'imported_balance',
       g.created_at AT TIME ZONE 'UTC'
  FROM public.goals g
  LEFT JOIN (SELECT goal_id, sum(amount) AS total FROM public.saving_transactions GROUP BY goal_id) s ON s.goal_id = g.id
 WHERE g.current_amount > COALESCE(s.total, 0)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    old_goals bigint;
    moved     bigint;
    mismatched bigint;
BEGIN
    SELECT count(*) INTO old_goals FROM public.goals;
    SELECT count(*) INTO moved FROM savings.goal sg JOIN public.goals g ON g.id::uuid = sg.id;
    IF moved <> old_goals THEN
        RAISE EXCEPTION 'goal 행 수가 다르다: public % → savings %', old_goals, moved;
    END IF;
    SELECT count(*) INTO mismatched
      FROM public.goals g
      LEFT JOIN (SELECT goal_id, sum(amount) AS total FROM savings.deposit GROUP BY goal_id) d ON d.goal_id = g.id::uuid
     WHERE COALESCE(d.total, 0) < g.current_amount;
    IF mismatched > 0 THEN
        RAISE EXCEPTION '적립 합이 옛 current_amount 보다 작은 목표 %개', mismatched;
    END IF;
    RAISE NOTICE 'savings 가져오기: 목표 % · 적립 % (잔액 행 %)', moved,
        (SELECT count(*) FROM savings.deposit WHERE goal_id IN (SELECT id::uuid FROM public.goals)),
        (SELECT count(*) FROM savings.deposit WHERE source = 'imported_balance');
END $$;

COMMIT;
