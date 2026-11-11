-- F017 v2 단계 2 (2026-11-11) — 사기 전 · 팔기 전 점검 원장. SRV-REQ-053 FR-4 · DB-REQ-043 FR-7.
-- 추가만. 롤백 = DROP TABLE trade_check_ledger. 사용자 열 0(종목 · 조건 · 기준 봉 단위) — 같은 키는 처음 한 줄만.
CREATE TABLE "trade_check_ledger" (
    "id" TEXT NOT NULL,
    "prereg_key" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL CHECK ("market" IN ('kr', 'crypto')),
    "side" TEXT NOT NULL CHECK ("side" IN ('buy', 'sell')),
    "condition_id" TEXT NOT NULL,
    "horizon" INTEGER NOT NULL,
    "ref_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL CHECK ("status" IN ('ok', 'below_min', 'no_condition')),
    "up_rate" DOUBLE PRECISION,
    "sample_eff" DOUBLE PRECISION,
    "price_at_check" DECIMAL(65,30),
    "checked_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_check_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_check_ledger_prereg_key_symbol_side_condition_id_hori_key" ON "trade_check_ledger"("prereg_key", "symbol", "side", "condition_id", "horizon", "ref_at");
CREATE INDEX "trade_check_ledger_ref_at_idx" ON "trade_check_ledger"("ref_at");
