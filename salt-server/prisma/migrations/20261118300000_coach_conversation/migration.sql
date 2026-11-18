-- 코치 대화(F006 C절 · DB-REQ-021 FR-1~10 · DB-REQ-022). 사람 표 둘 — 추가만.
CREATE TABLE "coach_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coach_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coach_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "intent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "explanation_source" TEXT,
    "links_json" JSONB,
    "gaps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coach_messages_pkey" PRIMARY KEY ("id"),
    -- 값 목록은 제약으로(DB-REQ-022) — 앱 버그가 이상한 상태를 남기지 못하게
    CONSTRAINT "coach_messages_role_check" CHECK ("role" IN ('user', 'assistant')),
    CONSTRAINT "coach_messages_status_check" CHECK ("status" IN ('streaming', 'complete', 'failed')),
    CONSTRAINT "coach_messages_source_check" CHECK ("explanation_source" IS NULL OR "explanation_source" IN ('rule', 'llm'))
);

CREATE INDEX "coach_conversations_user_id_last_message_at_idx" ON "coach_conversations"("user_id", "last_message_at" DESC);
CREATE INDEX "coach_messages_conversation_id_created_at_idx" ON "coach_messages"("conversation_id", "created_at" DESC);
CREATE INDEX "coach_messages_user_id_idx" ON "coach_messages"("user_id");

ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "coach_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE coach_conversations IS 'record: 코치와 나눈 대화 목록';
COMMENT ON TABLE coach_messages IS 'record: 코치에게 한 질문과 받은 답';
