-- F017 v4 2c — 사실 추출(SRV-REQ-053 FR-14 · DB-REQ-043 FR-9). 시장 층 · 사용자 열 0.
-- 되돌리기 = extracted_fact 지우기 + news_ai_body 열 둘 지우기(값은 다음 회차가 다시 채운다).

-- AI 경로 본문에 종목(제목에 걸린 종목 — 국내 제목 연결 · 코인 원장 태그)과 추출 시도 수
ALTER TABLE "news_ai_body" ADD COLUMN "symbols" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "news_ai_body" ADD COLUMN "extract_attempts" INTEGER NOT NULL DEFAULT 0;
-- 추출 대기(받았고 · 아직 추출 전) — 상태 · 추출 시각
CREATE INDEX "news_ai_body_status_extracted_idx" ON "news_ai_body" ("status", "extracted_at");

-- 추출 사실 — 기사 · 공시 본문에서 뽑은 사실 단위만. **기사 문장 칸 없음**(ADR-009 v4). 같은 원문 · 같은 무엇은 한 번
CREATE TABLE "extracted_fact" (
  "id" TEXT PRIMARY KEY,
  "source_kind" TEXT NOT NULL,
  "source_key" TEXT NOT NULL,
  "symbols" TEXT[] NOT NULL,
  "who" TEXT NOT NULL,
  "what" TEXT NOT NULL,
  "amount" NUMERIC,
  "unit" TEXT,
  "compared_to" TEXT,
  "when_text" TEXT,
  "event_kind" TEXT NOT NULL,
  "published_at" TIMESTAMPTZ(3) NOT NULL,
  "available_at" TIMESTAMPTZ(3) NOT NULL,
  "source_url" TEXT NOT NULL,
  "source_name" TEXT NOT NULL,
  "extractor_version" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "extracted_fact_source_kind_check" CHECK ("source_kind" IN ('article', 'disclosure'))
);
CREATE UNIQUE INDEX "extracted_fact_source_what_key" ON "extracted_fact" ("source_kind", "source_key", "what");
-- 종목 하나의 최근 사실(회사 사정 칸)
CREATE INDEX "extracted_fact_symbols_idx" ON "extracted_fact" USING GIN ("symbols");
CREATE INDEX "extracted_fact_available_idx" ON "extracted_fact" ("available_at");
