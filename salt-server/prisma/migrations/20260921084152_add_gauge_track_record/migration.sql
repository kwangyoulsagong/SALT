-- CreateTable
CREATE TABLE "gauge_track_records" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "gauge" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "horizon_days" INTEGER NOT NULL DEFAULT 30,
    "sample_count" INTEGER NOT NULL,
    "p25_return" DECIMAL(9,4),
    "median_return" DECIMAL(9,4),
    "p75_return" DECIMAL(9,4),
    "positive_rate" DECIMAL(5,4),
    "window_from" TIMESTAMP(3) NOT NULL,
    "window_to" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gauge_track_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gauge_track_records_symbol_gauge_bucket_horizon_days_key" ON "gauge_track_records"("symbol", "gauge", "bucket", "horizon_days");
