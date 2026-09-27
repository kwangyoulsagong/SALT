-- DB-REQ-031 FR-12 (2026-09-27, F009 슬라이스 6) — 계획의 진입 전 체크리스트 기록(FEATURE-009 FR-30).
--
-- nullable 컬럼 추가만. 기존 계획은 null(체크리스트를 보지 않았다)로 남는다. 조회 조건으로 쓰지 않는다.
--
-- 롤백: ALTER TABLE "trade_plans" DROP COLUMN "checklist";

-- AlterTable
ALTER TABLE "trade_plans" ADD COLUMN     "checklist" JSONB;
