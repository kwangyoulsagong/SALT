-- DB-REQ-031 FR-11 (2026-09-27, F009 슬라이스 6) — 월간 복기 저장.
--
-- 추가만. 한 사용자 · 한 달(KST) 한 행이고 만든 뒤 고치지 않는다(W06). payload 는 조회 조건으로 쓰지 않는 스냅샷이다.
--
-- 롤백(행 손실은 이 테이블뿐 — 다음 달 배치 · 요청이 지난달 것을 다시 만든다. 다만 그 사이 고친 태그가 반영된 숫자가 된다):
--   DROP TABLE "monthly_reviews";

-- CreateTable
CREATE TABLE "monthly_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reviews_user_id_month_key" ON "monthly_reviews"("user_id", "month" DESC);

-- AddForeignKey
ALTER TABLE "monthly_reviews" ADD CONSTRAINT "monthly_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
