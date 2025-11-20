-- CreateTable
CREATE TABLE "chart_drawings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "chart_period" TEXT NOT NULL,
    "drawing_data" JSONB NOT NULL,
    "thumbnail" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_drawings_user_id_symbol_idx" ON "chart_drawings"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "chart_drawings_user_id_created_at_idx" ON "chart_drawings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "chart_drawings_is_public_like_count_idx" ON "chart_drawings"("is_public", "like_count");

-- AddForeignKey
ALTER TABLE "chart_drawings" ADD CONSTRAINT "chart_drawings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
