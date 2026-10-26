-- F011 · DB-REQ-031 FR-11 개정 — 월간 복기를 자산군마다 한 벌(국내 주식판, SRV-REQ-040 FR-48).
-- NOT NULL DEFAULT 'crypto' — 지금까지 저장된 복기는 전부 코인 거래로 만든 것이라 의미가 그대로다.
-- 유니크를 (user_id, month) → (user_id, asset_type, month) 로 바꾼다.
-- 롤백(국내 행을 먼저 지운다):
--   DELETE FROM "monthly_reviews" WHERE "asset_type" <> 'crypto';
--   DROP INDEX "monthly_reviews_user_id_asset_type_month_key";
--   CREATE UNIQUE INDEX "monthly_reviews_user_id_month_key" ON "monthly_reviews"("user_id", "month" DESC);
--   ALTER TABLE "monthly_reviews" DROP COLUMN "asset_type";
ALTER TABLE "monthly_reviews" ADD COLUMN "asset_type" "AssetType" NOT NULL DEFAULT 'crypto';

DROP INDEX "monthly_reviews_user_id_month_key";

CREATE UNIQUE INDEX "monthly_reviews_user_id_asset_type_month_key" ON "monthly_reviews"("user_id", "asset_type", "month" DESC);
