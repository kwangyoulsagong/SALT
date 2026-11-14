-- F017 v4 2b+ — DART 공시 목록(유니버스 종목 1년 백필 + 회차마다 새 것). 회사 사정 칸이 공시 목록 자체를 사실로 쓴다(LLM 0).
-- 시장 층 · 사용자 열 0. 되돌리기 = 표 지우기
CREATE TABLE "dart_filing" (
  "rcept_no" TEXT PRIMARY KEY,
  "stock_code" TEXT NOT NULL,
  "corp_name" TEXT NOT NULL,
  "report_name" TEXT NOT NULL,
  "pblntf_ty" TEXT NOT NULL,
  "rcept_date" DATE NOT NULL,
  "first_seen_at" TIMESTAMPTZ(3) NOT NULL
);
-- 종목 하나의 최근 공시(회사 사정 칸)
CREATE INDEX "dart_filing_stock_date_idx" ON "dart_filing" ("stock_code", "rcept_date" DESC);
