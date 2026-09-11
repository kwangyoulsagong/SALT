-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InsightType" ADD VALUE 'rebalance';
ALTER TYPE "InsightType" ADD VALUE 'whale_buy_signal';
ALTER TYPE "InsightType" ADD VALUE 'whale_sell_signal';
