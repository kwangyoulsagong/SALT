-- 서버 S3b(2026-11-12, `SRV-REQ-048` FR-8 · `DB-REQ-036` 부록 B1) — 사용자 표가 identity 스키마로 간다. 다른 표의 user_id 는 FK 없는 열이 된다.
-- 탈퇴 연쇄 삭제(onDelete: Cascade)는 사라진다 — 계정 삭제 경로는 지금 0 이고, S3c 에 UserDeletionRequested 구독으로 다시 만든다(`SRV-REQ-048` FR-4).
-- 되돌리기: 같은 이름으로 ADD CONSTRAINT … FOREIGN KEY (user_id) REFERENCES users(id)(행은 그대로라 다시 걸린다).

-- DropForeignKey
ALTER TABLE "investment_watchlist" DROP CONSTRAINT "investment_watchlist_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_mission_progress" DROP CONSTRAINT "user_mission_progress_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_user_id_fkey";

-- DropForeignKey
ALTER TABLE "point_transactions" DROP CONSTRAINT "point_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolio_transactions" DROP CONSTRAINT "portfolio_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolio_holdings" DROP CONSTRAINT "portfolio_holdings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "news_bookmarks" DROP CONSTRAINT "news_bookmarks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sentiment_alerts" DROP CONSTRAINT "sentiment_alerts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "smart_money_alerts" DROP CONSTRAINT "smart_money_alerts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_investment_profiles" DROP CONSTRAINT "user_investment_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_plans" DROP CONSTRAINT "trade_plans_user_id_fkey";

-- DropForeignKey
ALTER TABLE "monthly_reviews" DROP CONSTRAINT "monthly_reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "decision_outcomes" DROP CONSTRAINT "decision_outcomes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "coach_generation_logs" DROP CONSTRAINT "coach_generation_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "llm_call_logs" DROP CONSTRAINT "llm_call_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "investment_insights" DROP CONSTRAINT "investment_insights_user_id_fkey";

-- DropForeignKey
ALTER TABLE "coach_recommendation_snapshots" DROP CONSTRAINT "coach_recommendation_snapshots_user_id_fkey";

-- DropForeignKey
ALTER TABLE "execution_logs" DROP CONSTRAINT "execution_logs_user_id_fkey";

