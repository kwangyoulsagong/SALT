-- F010 슬라이스 0 (2026-09-28) — 저장 추천 불변 원장.
-- 추천은 사용자당 한 행(investment_insights, dedupe_key=main_coach)이 upsert 로 덮어써져 이력이 없었고,
-- 성적표는 관찰 기간 없이 "최신 종가" 대비였다. 추천마다 행을 남기고 30일 뒤 일봉 종가로 채점한다.
-- 표본 출처 CHECK 는 symbol_judgment_snapshots 와 같다(DB-REQ-017 FR-60). 롤백 = DROP TABLE (다른 표 참조 없음).

CREATE TABLE "coach_recommendation_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "entry_price" DECIMAL(65,30) NOT NULL,
    "judged_at" TIMESTAMP(3) NOT NULL,
    "sample_origin" TEXT NOT NULL,
    "exit_price" DECIMAL(65,30),
    "return_rate" DECIMAL(12,6),
    "outcome" TEXT,
    "evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_recommendation_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coach_recommendation_snapshots_sample_origin_check"
      CHECK ("sample_origin" IN ('live', 'backtest', 'synthetic'))
);

CREATE UNIQUE INDEX "coach_recommendation_snapshots_user_id_symbol_action_judged_at_key"
  ON "coach_recommendation_snapshots"("user_id", "symbol", "action", "judged_at");
CREATE INDEX "coach_recommendation_snapshots_user_id_signal_type_outcome_judged_at_idx"
  ON "coach_recommendation_snapshots"("user_id", "signal_type", "outcome", "judged_at" DESC);
CREATE INDEX "coach_recommendation_snapshots_evaluated_at_judged_at_idx"
  ON "coach_recommendation_snapshots"("evaluated_at", "judged_at");

ALTER TABLE "coach_recommendation_snapshots"
  ADD CONSTRAINT "coach_recommendation_snapshots_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
