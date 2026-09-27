-- F010 슬라이스 0 (2026-09-28) — 종목 판단 채점에 왕복 수수료 0.1% 를 넣는다.
-- 규칙(domain/policy/symbolJudgment.ts judgeOutcome): 후보(review_*)는 return_rate > 0.001 이면 적중,
-- 피하기(avoid)는 return_rate <= 0.001 이면 적중. 관망(wait)은 그대로(±2% · ±10%).
-- 이미 판정된 행의 outcome 을 같은 규칙으로 다시 매긴다 — return_rate 는 그대로라 되돌릴 수 있다.
-- 롤백: 아래 두 UPDATE 를 경계 0 으로 다시 실행한다.

UPDATE "symbol_judgment_snapshots"
SET "outcome" = CASE WHEN "return_rate" > 0.001 THEN 'hit' ELSE 'miss' END
WHERE "outcome" IS NOT NULL AND "return_rate" IS NOT NULL
  AND "action" IN ('review_short_opportunity', 'review_accumulation');

UPDATE "symbol_judgment_snapshots"
SET "outcome" = CASE WHEN "return_rate" <= 0.001 THEN 'hit' ELSE 'miss' END
WHERE "outcome" IS NOT NULL AND "return_rate" IS NOT NULL
  AND "action" = 'avoid';
