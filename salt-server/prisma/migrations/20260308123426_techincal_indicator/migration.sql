-- CreateEnum
CREATE TYPE "Timeframe" AS ENUM ('m1', 'm5', 'm15', 'h1', 'h4', 'd1');

-- CreateTable
CREATE TABLE "technical_indicators" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rsi_14" DOUBLE PRECISION,
    "ma_20" DOUBLE PRECISION,
    "ma_50" DOUBLE PRECISION,
    "macd" DOUBLE PRECISION,
    "macd_signal" DOUBLE PRECISION,
    "macd_hist" DOUBLE PRECISION,
    "volume_avg_20" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "technical_indicators_symbol_timeframe_timestamp_idx" ON "technical_indicators"("symbol", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "technical_indicators_symbol_timeframe_timestamp_key" ON "technical_indicators"("symbol", "timeframe", "timestamp");
