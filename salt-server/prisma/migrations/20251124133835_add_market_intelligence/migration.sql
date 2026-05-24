-- CreateTable
CREATE TABLE "market_sentiments" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "sentiment_score" INTEGER NOT NULL,
    "fear_greed_index" INTEGER,
    "volatility" DOUBLE PRECISION NOT NULL,
    "volume_24h" DOUBLE PRECISION NOT NULL,
    "price_change_24h" DOUBLE PRECISION NOT NULL,
    "social_mentions" INTEGER NOT NULL DEFAULT 0,
    "search_trend" INTEGER NOT NULL DEFAULT 0,
    "sentiment_label" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_sentiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_transactions" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amount_krw" DOUBLE PRECISION NOT NULL,
    "exchange" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentiment_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "trigger_score" INTEGER NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sentiment_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_money_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "min_amount" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_money_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_sentiments_symbol_calculated_at_idx" ON "market_sentiments"("symbol", "calculated_at");

-- CreateIndex
CREATE INDEX "market_sentiments_calculated_at_idx" ON "market_sentiments"("calculated_at");

-- CreateIndex
CREATE INDEX "whale_transactions_symbol_detected_at_idx" ON "whale_transactions"("symbol", "detected_at");

-- CreateIndex
CREATE INDEX "sentiment_alerts_user_id_idx" ON "sentiment_alerts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sentiment_alerts_user_id_symbol_trigger_type_key" ON "sentiment_alerts"("user_id", "symbol", "trigger_type");

-- CreateIndex
CREATE INDEX "smart_money_alerts_user_id_idx" ON "smart_money_alerts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "smart_money_alerts_user_id_symbol_key" ON "smart_money_alerts"("user_id", "symbol");

-- AddForeignKey
ALTER TABLE "sentiment_alerts" ADD CONSTRAINT "sentiment_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_money_alerts" ADD CONSTRAINT "smart_money_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
