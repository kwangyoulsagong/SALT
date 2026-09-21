-- CreateTable
CREATE TABLE "symbol_judgment_snapshots" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "entry_price" DECIMAL(65,30) NOT NULL,
    "judged_at" TIMESTAMP(3) NOT NULL,
    "exit_price" DECIMAL(65,30),
    "return_rate" DECIMAL(12,6),
    "outcome" TEXT,
    "evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symbol_judgment_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symbol_judgment_snapshots_signal_type_outcome_judged_at_idx" ON "symbol_judgment_snapshots"("signal_type", "outcome", "judged_at" DESC);

-- CreateIndex
CREATE INDEX "symbol_judgment_snapshots_evaluated_at_judged_at_idx" ON "symbol_judgment_snapshots"("evaluated_at", "judged_at");

-- CreateIndex
CREATE UNIQUE INDEX "symbol_judgment_snapshots_symbol_mode_judged_at_key" ON "symbol_judgment_snapshots"("symbol", "mode", "judged_at");
