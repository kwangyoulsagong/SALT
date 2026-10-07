-- F011 슬라이스 0 · DB-REQ-033 — 국내 주식 기반(추가만).
-- 되돌리기: DROP TABLE kr_stock_quotes, kr_stock_master, external_api_tokens, market_holidays;
-- enum 값 kr_stock 은 Postgres 에서 뺄 수 없다 — 쓰는 행이 없게 두는 것이 롤백이다.
-- (diff 가 함께 낸 기존 인덱스 이름 RenameIndex 2줄은 이 변경과 무관해 뺐다)
-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'kr_stock';

-- CreateTable
CREATE TABLE "kr_stock_master" (
    "code" TEXT NOT NULL,
    "standard_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "group_code" TEXT NOT NULL,
    "sector_code" TEXT,
    "base_price" DECIMAL(38,10),
    "shares_outstanding" BIGINT,
    "market_cap" DECIMAL(38,10),
    "is_halted" BOOLEAN NOT NULL DEFAULT false,
    "is_administrative" BOOLEAN NOT NULL DEFAULT false,
    "warn_code" TEXT NOT NULL DEFAULT '00',
    "overheat_code" TEXT NOT NULL DEFAULT '0',
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "listed_at" DATE,
    "delisted_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kr_stock_master_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "kr_stock_quotes" (
    "code" TEXT NOT NULL,
    "price" DECIMAL(38,10) NOT NULL,
    "change" DECIMAL(38,10) NOT NULL,
    "change_rate" DECIMAL(18,8) NOT NULL,
    "volume" BIGINT NOT NULL,
    "trade_value" DECIMAL(38,10) NOT NULL,
    "market_cap" DECIMAL(38,10),
    "base_price" DECIMAL(38,10),
    "upper_limit" DECIMAL(38,10),
    "lower_limit" DECIMAL(38,10),
    "status_code" TEXT,
    "warn_code" TEXT,
    "is_halted" BOOLEAN NOT NULL DEFAULT false,
    "per" DECIMAL(18,8),
    "pbr" DECIMAL(18,8),
    "eps" DECIMAL(38,10),
    "bps" DECIMAL(38,10),
    "week52_high" DECIMAL(38,10),
    "week52_low" DECIMAL(38,10),
    "foreign_rate" DECIMAL(18,8),
    "feed" TEXT NOT NULL,
    "price_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kr_stock_quotes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "external_api_tokens" (
    "provider" TEXT NOT NULL,
    "token_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_api_tokens_pkey" PRIMARY KEY ("provider","token_type")
);

-- CreateTable
CREATE TABLE "market_holidays" (
    "market" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_open" BOOLEAN NOT NULL,
    "is_trading_day" BOOLEAN NOT NULL,
    "is_business_day" BOOLEAN NOT NULL,
    "is_settlement_day" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_holidays_pkey" PRIMARY KEY ("market","date")
);

-- CreateIndex
CREATE INDEX "kr_stock_master_group_code_market_cap_idx" ON "kr_stock_master"("group_code", "market_cap");

-- AddForeignKey
ALTER TABLE "kr_stock_quotes" ADD CONSTRAINT "kr_stock_quotes_code_fkey" FOREIGN KEY ("code") REFERENCES "kr_stock_master"("code") ON DELETE CASCADE ON UPDATE CASCADE;

