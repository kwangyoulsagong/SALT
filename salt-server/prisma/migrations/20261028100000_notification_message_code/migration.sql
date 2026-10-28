-- 알림 1종 · 코드만(SRV-REQ-008 FR-20 · 25). 새 행은 messageCode 만 쓰고 문장 칸은 비운다.
-- 되돌리기: 새 행의 title · message 가 NULL 이라 NOT NULL 복구 전에 채워야 한다
--   UPDATE "InvestmentNotification" SET "title" = COALESCE("title", ''), "message" = COALESCE("message", '');
--   ALTER TABLE "InvestmentNotification" ALTER COLUMN "title" SET NOT NULL, ALTER COLUMN "message" SET NOT NULL, DROP COLUMN "messageCode";
ALTER TABLE "InvestmentNotification" ADD COLUMN "messageCode" TEXT;
ALTER TABLE "InvestmentNotification" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "InvestmentNotification" ALTER COLUMN "message" DROP NOT NULL;
