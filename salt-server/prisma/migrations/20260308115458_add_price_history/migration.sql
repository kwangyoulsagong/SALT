/*
  Warnings:

  - A unique constraint covering the columns `[user_id,symbol,asset_type]` on the table `portfolio_holdings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `asset_type` to the `portfolio_holdings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `asset_type` to the `portfolio_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('ai_coach', 'smart_buy_zone', 'behavior_analysis', 'risk_alert');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('buy_zone_entry', 'risk_limit', 'rebalance', 'stop_loss', 'take_profit', 'sentiment_filter', 'whale_filter');

-- CreateEnum
CREATE TYPE "TriggerStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- DropIndex
DROP INDEX "portfolio_holdings_user_id_symbol_key";

-- DropIndex
DROP INDEX "portfolio_transactions_user_id_symbol_idx";

-- AlterTable
ALTER TABLE "market_assets" ADD COLUMN     "asset_type" "AssetType" NOT NULL DEFAULT 'crypto';

-- AlterTable
ALTER TABLE "portfolio_holdings" ADD COLUMN     "asset_type" "AssetType" NOT NULL;

-- AlterTable
ALTER TABLE "portfolio_transactions" ADD COLUMN     "asset_type" "AssetType" NOT NULL;

-- CreateTable
CREATE TABLE "InvestmentNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT,
    "source" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 50,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "timeframe" TEXT NOT NULL,
    "open" DECIMAL(65,30) NOT NULL,
    "high" DECIMAL(65,30) NOT NULL,
    "low" DECIMAL(65,30) NOT NULL,
    "close" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_investment_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "riskTolerance" TEXT NOT NULL DEFAULT 'medium',
    "maxSingleAssetWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "rebalanceBand" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "panicSellWindowHours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_investment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_insights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT,
    "asset_type" "AssetType",
    "type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "payload" JSONB,
    "dedupe_key" TEXT NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "investment_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_playbooks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "target_allocation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_rules" (
    "id" TEXT NOT NULL,
    "playbook_id" TEXT NOT NULL,
    "type" "RuleType" NOT NULL,
    "symbol" TEXT,
    "params" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_triggers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "playbook_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "symbol" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "status" "TriggerStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "playbook_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trigger_id" TEXT,
    "symbol" TEXT,
    "action" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "note" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentNotification_userId_isRead_idx" ON "InvestmentNotification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "InvestmentNotification_symbol_idx" ON "InvestmentNotification"("symbol");

-- CreateIndex
CREATE INDEX "InvestmentNotification_createdAt_idx" ON "InvestmentNotification"("createdAt");

-- CreateIndex
CREATE INDEX "price_history_symbol_timeframe_timestamp_idx" ON "price_history"("symbol", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_symbol_timeframe_timestamp_key" ON "price_history"("symbol", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "user_investment_profiles_user_id_key" ON "user_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "investment_insights_user_id_type_idx" ON "investment_insights"("user_id", "type");

-- CreateIndex
CREATE INDEX "investment_insights_user_id_created_at_idx" ON "investment_insights"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "investment_insights_user_id_type_dedupe_key_key" ON "investment_insights"("user_id", "type", "dedupe_key");

-- CreateIndex
CREATE INDEX "investment_playbooks_user_id_idx" ON "investment_playbooks"("user_id");

-- CreateIndex
CREATE INDEX "investment_rules_playbook_id_idx" ON "investment_rules"("playbook_id");

-- CreateIndex
CREATE INDEX "playbook_triggers_user_id_status_idx" ON "playbook_triggers"("user_id", "status");

-- CreateIndex
CREATE INDEX "playbook_triggers_playbook_id_idx" ON "playbook_triggers"("playbook_id");

-- CreateIndex
CREATE INDEX "execution_logs_user_id_executed_at_idx" ON "execution_logs"("user_id", "executed_at");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_holdings_user_id_symbol_asset_type_key" ON "portfolio_holdings"("user_id", "symbol", "asset_type");

-- CreateIndex
CREATE INDEX "portfolio_transactions_user_id_asset_type_symbol_idx" ON "portfolio_transactions"("user_id", "asset_type", "symbol");

-- AddForeignKey
ALTER TABLE "InvestmentNotification" ADD CONSTRAINT "InvestmentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_investment_profiles" ADD CONSTRAINT "user_investment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_insights" ADD CONSTRAINT "investment_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_playbooks" ADD CONSTRAINT "investment_playbooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rules" ADD CONSTRAINT "investment_rules_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "investment_playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_triggers" ADD CONSTRAINT "playbook_triggers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_triggers" ADD CONSTRAINT "playbook_triggers_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "investment_playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_triggers" ADD CONSTRAINT "playbook_triggers_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "investment_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "playbook_triggers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
