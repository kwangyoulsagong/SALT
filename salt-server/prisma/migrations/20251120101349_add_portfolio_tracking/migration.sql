-- CreateTable
CREATE TABLE "portfolio_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_holdings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "total_quantity" DOUBLE PRECISION NOT NULL,
    "average_buy_price" DOUBLE PRECISION NOT NULL,
    "total_invested" DOUBLE PRECISION NOT NULL,
    "current_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unrealized_profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unrealized_profit_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realized_profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_transactions_user_id_symbol_idx" ON "portfolio_transactions"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "portfolio_transactions_user_id_transaction_date_idx" ON "portfolio_transactions"("user_id", "transaction_date");

-- CreateIndex
CREATE INDEX "portfolio_transactions_transaction_type_idx" ON "portfolio_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "portfolio_holdings_user_id_idx" ON "portfolio_holdings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_holdings_user_id_symbol_key" ON "portfolio_holdings"("user_id", "symbol");

-- AddForeignKey
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
