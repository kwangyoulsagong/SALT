-- CreateTable
CREATE TABLE "coach_generation_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "llm_source" TEXT,
    "duration_ms" INTEGER,
    "error_code" TEXT,

    CONSTRAINT "coach_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_generation_logs_user_id_requested_at_idx" ON "coach_generation_logs"("user_id", "requested_at" DESC);

-- AddForeignKey
ALTER TABLE "coach_generation_logs" ADD CONSTRAINT "coach_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
