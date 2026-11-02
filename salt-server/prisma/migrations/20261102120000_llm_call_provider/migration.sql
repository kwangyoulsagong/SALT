-- 해설 다듬기 공급자 라우팅(SRV-REQ-050 FR-8 · FR-9). 추가만 — 기존 행은 전부 Gemini 시도였다(기본값으로 채워진다).
-- 되돌리기: ALTER TABLE "llm_call_logs" DROP COLUMN "provider", DROP COLUMN "dropped_sentences";
ALTER TABLE "llm_call_logs" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE "llm_call_logs" ADD COLUMN "dropped_sentences" INTEGER;
