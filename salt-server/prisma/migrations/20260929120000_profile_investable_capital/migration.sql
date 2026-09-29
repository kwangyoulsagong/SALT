-- DB-REQ-031 FR-9 (2026-09-29, F010 슬라이스 5 · SRV-REQ-024 FR-182) — 투자금(현금 포함) 한 칸.
--
-- 목표 비중 안내가 "전체 투자금 대비 비중"을 계산하려면 앱이 모르는 현금이 필요하다(거래는 전부 수동 입력 · 계좌 연동 없음).
-- 사용자가 직접 적는다. 비어 있으면 서버가 코인 평가금 합을 전체로 보고 응답에 그렇다고 밝힌다 — 0 이나 기본값으로 채우지 않는다.
-- 추가만 한다. 기존 행은 NULL.
--
-- 롤백: ALTER TABLE "user_investment_profiles" DROP COLUMN "investable_capital";

ALTER TABLE "user_investment_profiles" ADD COLUMN "investable_capital" DECIMAL(38,10);
ALTER TABLE "user_investment_profiles" ADD CONSTRAINT "user_investment_profiles_investable_capital_positive"
  CHECK ("investable_capital" IS NULL OR "investable_capital" > 0);
