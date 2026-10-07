-- F010 슬라이스 7 · DB-REQ-017 FR-65 — LLM 시도 원장(비용 상한의 근거). 되돌리기: DROP TABLE "llm_call_logs";
-- CreateTable
CREATE TABLE "llm_call_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error_code" TEXT,
    "prompt_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,

    CONSTRAINT "llm_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_call_logs_requested_at_idx" ON "llm_call_logs"("requested_at");

-- CreateIndex
CREATE INDEX "llm_call_logs_user_id_requested_at_idx" ON "llm_call_logs"("user_id", "requested_at");

-- AddForeignKey
ALTER TABLE "llm_call_logs" ADD CONSTRAINT "llm_call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
