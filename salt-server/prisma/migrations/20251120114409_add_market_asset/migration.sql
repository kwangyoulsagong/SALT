-- CreateTable
CREATE TABLE "market_assets" (
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "korean_name" TEXT NOT NULL,
    "english_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "listed_at" TIMESTAMP(3),
    "delisted_at" TIMESTAMP(3),

    CONSTRAINT "market_assets_pkey" PRIMARY KEY ("symbol")
);

-- CreateIndex
CREATE INDEX "market_assets_is_active_idx" ON "market_assets"("is_active");
