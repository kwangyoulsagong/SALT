-- F011 슬라이스 6b — 시간외 단일가(FR-27) 칸. 정규장 현재가 · 등락과 섞지 않으려 칸을 따로 둔다(`DB-REQ-033` FR-9).
-- 전부 nullable 추가라 기존 행 · 쓰기 경로는 그대로다.
-- 롤백: ALTER TABLE "kr_stock_quotes" DROP COLUMN "after_hours_price", DROP COLUMN "after_hours_change",
--       DROP COLUMN "after_hours_change_rate", DROP COLUMN "after_hours_volume", DROP COLUMN "after_hours_at";

ALTER TABLE "kr_stock_quotes"
  ADD COLUMN "after_hours_price" DECIMAL(38,10),
  ADD COLUMN "after_hours_change" DECIMAL(38,10),
  ADD COLUMN "after_hours_change_rate" DECIMAL(18,8),
  ADD COLUMN "after_hours_volume" BIGINT,
  ADD COLUMN "after_hours_at" TIMESTAMP(3);
