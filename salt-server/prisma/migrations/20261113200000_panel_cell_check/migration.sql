-- 패널 칸 채움 실측(OPS-004 · F017 v4 순서 1 뒤). 시장 층 — 사용자 열 0 · 30일 보관
CREATE TABLE "panel_cell_check" (
    "id" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL,
    "market" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "cell_key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "new_symbol" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "panel_cell_check_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "panel_cell_check_run_at_idx" ON "panel_cell_check"("run_at");
