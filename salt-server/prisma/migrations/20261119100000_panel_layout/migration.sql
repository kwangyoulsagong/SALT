-- PC 패널 배치(F006 A절 · DB-REQ-021 FR-20~24). 사람 표 하나 — 추가만.
CREATE TABLE "panel_layouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "tree_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "panel_layouts_pkey" PRIMARY KEY ("id"),
    -- 값 목록 · 크기 상한은 제약으로(DB-REQ-022 와 같은 태도) — 앱을 우회한 쓰기의 뒷문 잠금 — jsonb 글은 빈칸이 붙어 길어지니 앱 문턱(16KB)의 두 배(FR-24)
    CONSTRAINT "panel_layouts_surface_check" CHECK ("surface" IN ('pc')),
    CONSTRAINT "panel_layouts_tree_size_check" CHECK (octet_length("tree_json"::text) <= 32768)
);

CREATE UNIQUE INDEX "panel_layouts_user_id_surface_key" ON "panel_layouts"("user_id", "surface");

COMMENT ON TABLE panel_layouts IS 'record: PC 코치 화면에서 옮겨 둔 칸 배치';
