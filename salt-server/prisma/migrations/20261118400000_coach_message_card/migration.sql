-- 코치 대화 2단계(F006 C절 FR-24 · 25 · DB-REQ-021 FR-4 · 5 · DB-REQ-022 FR-10~14) — 답에 붙는 저장 추천 카드. 추가만(기존 행 그대로 NULL).
ALTER TABLE "coach_messages" ADD COLUMN "card_payload" JSONB;
ALTER TABLE "coach_messages" ADD COLUMN "insight_id" TEXT;

-- 추천 행이 지워질 때 FK 확인이 표를 훑지 않게
CREATE INDEX "coach_messages_insight_id_idx" ON "coach_messages"("insight_id");

ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_insight_id_fkey"
    FOREIGN KEY ("insight_id") REFERENCES "investment_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 카드는 질문 줄에 붙지 않는다
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_card_role_check"
    CHECK ("card_payload" IS NULL OR "role" = 'assistant');
