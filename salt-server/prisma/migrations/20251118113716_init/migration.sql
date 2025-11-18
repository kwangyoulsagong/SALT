-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('travel', 'first_car', 'startup', 'wedding', 'creative', 'other');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'paused');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('crypto', 'stock');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('bullish', 'bearish', 'neutral');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('saving', 'investment', 'learning', 'social');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "MissionProgressStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('earn', 'spend');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "profile_image_url" TEXT,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "user_level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "GoalCategory" NOT NULL,
    "targetAmount" DECIMAL(65,30) NOT NULL,
    "current_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "theme_color" TEXT NOT NULL DEFAULT '#4A90E2',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saving_transactions" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saving_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_watchlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "current_price" DECIMAL(65,30),
    "price_change_24h" DECIMAL(65,30),
    "last_updated" TIMESTAMP(3),
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_analysis_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "prediction" "PredictionType" NOT NULL,
    "confidence_score" DECIMAL(65,30),
    "analysis_text" TEXT NOT NULL,
    "key_factors" JSONB,
    "price_at_analysis" DECIMAL(65,30) NOT NULL,
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_missions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mission_type" "MissionType" NOT NULL,
    "points_reward" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'easy',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mission_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "status" "MissionProgressStatus" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_mission_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "saving_transactions_goal_id_transaction_date_idx" ON "saving_transactions"("goal_id", "transaction_date");

-- CreateIndex
CREATE INDEX "saving_transactions_user_id_transaction_date_idx" ON "saving_transactions"("user_id", "transaction_date");

-- CreateIndex
CREATE INDEX "investment_watchlist_user_id_asset_type_idx" ON "investment_watchlist"("user_id", "asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "investment_watchlist_user_id_asset_type_symbol_key" ON "investment_watchlist"("user_id", "asset_type", "symbol");

-- CreateIndex
CREATE INDEX "ai_analysis_sessions_user_id_created_at_idx" ON "ai_analysis_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_analyses_session_id_idx" ON "ai_analyses"("session_id");

-- CreateIndex
CREATE INDEX "ai_analyses_user_id_analyzed_at_idx" ON "ai_analyses"("user_id", "analyzed_at");

-- CreateIndex
CREATE INDEX "user_mission_progress_user_id_started_at_idx" ON "user_mission_progress"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_mission_progress_user_id_mission_id_started_at_key" ON "user_mission_progress"("user_id", "mission_id", "started_at");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_earned_at_idx" ON "user_achievements"("user_id", "earned_at");

-- CreateIndex
CREATE INDEX "point_transactions_user_id_created_at_idx" ON "point_transactions"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_transactions" ADD CONSTRAINT "saving_transactions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_transactions" ADD CONSTRAINT "saving_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_watchlist" ADD CONSTRAINT "investment_watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_sessions" ADD CONSTRAINT "ai_analysis_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_analysis_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "daily_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
