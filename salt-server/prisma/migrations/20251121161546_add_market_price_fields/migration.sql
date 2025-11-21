-- AlterTable
ALTER TABLE "market_assets" ADD COLUMN     "change_24h" DECIMAL(65,30),
ADD COLUMN     "current_price" DECIMAL(65,30),
ADD COLUMN     "high_24h" DECIMAL(65,30),
ADD COLUMN     "low_24h" DECIMAL(65,30),
ADD COLUMN     "price_updated_at" TIMESTAMP(3),
ADD COLUMN     "trade_value_24h" DECIMAL(65,30),
ADD COLUMN     "volume_24h" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "market_assets_trade_value_24h_idx" ON "market_assets"("trade_value_24h");

-- CreateIndex
CREATE INDEX "market_assets_change_24h_idx" ON "market_assets"("change_24h");

-- CreateIndex
CREATE INDEX "market_assets_current_price_idx" ON "market_assets"("current_price");

-- CreateIndex
CREATE INDEX "market_assets_price_updated_at_idx" ON "market_assets"("price_updated_at");
