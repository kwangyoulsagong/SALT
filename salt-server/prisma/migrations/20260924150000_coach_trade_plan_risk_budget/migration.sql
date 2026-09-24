-- DB-REQ-031 (2026-09-24, F009 슬라이스 1) — 거래 계획 · 결정 결과 · 프로필 리스크 예산.
--
-- 전부 추가다. 기존 행 · 컬럼을 바꾸지 않는다. 새 프로필 컬럼은 nullable 이고(hide_purchase_price 만 false 기본),
-- 비어 있는 예산을 0 이나 기본값으로 채우지 않는다(FEATURE-009 FR-2).
--
-- 롤백(행 손실은 두 새 테이블뿐):
--   DROP TABLE "decision_outcomes"; DROP TABLE "trade_plans";
--   ALTER TABLE "user_investment_profiles" DROP COLUMN "hide_purchase_price", DROP COLUMN "monthly_loss_budget",
--     DROP COLUMN "monthly_loss_budget_unit", DROP COLUMN "per_trade_max_loss", DROP COLUMN "per_trade_max_loss_unit",
--     DROP COLUMN "target_volatility";

-- AlterTable
ALTER TABLE "user_investment_profiles" ADD COLUMN     "hide_purchase_price" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthly_loss_budget" DECIMAL(38,10),
ADD COLUMN     "monthly_loss_budget_unit" TEXT,
ADD COLUMN     "per_trade_max_loss" DECIMAL(38,10),
ADD COLUMN     "per_trade_max_loss_unit" TEXT,
ADD COLUMN     "target_volatility" DECIMAL(18,8);

-- CreateTable
CREATE TABLE "trade_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "stop_price" DECIMAL(38,10),
    "target_price" DECIMAL(38,10),
    "planned_quantity" DECIMAL(38,18),
    "thesis" TEXT,
    "invalidation" TEXT,
    "review_at" TIMESTAMP(3),
    "probability_up" DECIMAL(18,8),
    "planned_at" TIMESTAMP(3) NOT NULL,
    "sample_origin" TEXT NOT NULL,
    "adherence_label" TEXT,
    "adherence_evaluated_at" TIMESTAMP(3),
    "user_adherence_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_outcomes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "closing_transaction_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL,
    "holding_days" DECIMAL(18,8) NOT NULL,
    "quantity" DECIMAL(38,18) NOT NULL,
    "net_pnl_krw" DECIMAL(38,10) NOT NULL,
    "fees_krw" DECIMAL(38,10) NOT NULL,
    "net_return" DECIMAL(18,8) NOT NULL,
    "r_multiple" DECIMAL(18,8),
    "benchmark_return" DECIMAL(18,8),
    "adherence_label" TEXT,
    "auto_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_tags_confirmed_at" TIMESTAMP(3),
    "sample_origin" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_plans_user_id_symbol_planned_at_idx" ON "trade_plans"("user_id", "symbol", "planned_at" DESC);

-- CreateIndex
CREATE INDEX "trade_plans_transaction_id_idx" ON "trade_plans"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "decision_outcomes_closing_transaction_id_key" ON "decision_outcomes"("closing_transaction_id");

-- CreateIndex
CREATE INDEX "decision_outcomes_user_id_closed_at_idx" ON "decision_outcomes"("user_id", "closed_at" DESC);

-- CreateIndex
CREATE INDEX "decision_outcomes_plan_id_idx" ON "decision_outcomes"("plan_id");

-- AddForeignKey
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "portfolio_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "trade_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_closing_transaction_id_fkey" FOREIGN KEY ("closing_transaction_id") REFERENCES "portfolio_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 값 검증. 서비스(Zod)가 먼저 막지만, 판정 · 집계가 읽는 열은 DB 도 지킨다 — 모르는 값이 섞이면 집계가 조용히 틀린다
ALTER TABLE "user_investment_profiles"
  ADD CONSTRAINT "user_investment_profiles_budget_unit_check" CHECK (
    ("monthly_loss_budget_unit" IS NULL OR "monthly_loss_budget_unit" IN ('krw', 'percent'))
    AND ("per_trade_max_loss_unit" IS NULL OR "per_trade_max_loss_unit" IN ('krw', 'percent'))
    AND (("monthly_loss_budget" IS NULL) = ("monthly_loss_budget_unit" IS NULL))
    AND (("per_trade_max_loss" IS NULL) = ("per_trade_max_loss_unit" IS NULL))
    AND ("monthly_loss_budget" IS NULL OR "monthly_loss_budget" > 0)
    AND ("per_trade_max_loss" IS NULL OR "per_trade_max_loss" > 0)
    AND ("target_volatility" IS NULL OR ("target_volatility" > 0 AND "target_volatility" <= 2))
  );

ALTER TABLE "trade_plans"
  ADD CONSTRAINT "trade_plans_values_check" CHECK (
    "side" IN ('buy', 'sell')
    AND "sample_origin" IN ('live', 'backtest', 'synthetic')
    AND ("probability_up" IS NULL OR ("probability_up" >= 0 AND "probability_up" <= 1))
    AND ("stop_price" IS NULL OR "stop_price" > 0)
    AND ("target_price" IS NULL OR "target_price" > 0)
    AND ("planned_quantity" IS NULL OR "planned_quantity" > 0)
  );

ALTER TABLE "decision_outcomes"
  ADD CONSTRAINT "decision_outcomes_sample_origin_check" CHECK ("sample_origin" IN ('live', 'backtest', 'synthetic'));
