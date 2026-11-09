-- 기사 본문 캐시(SRV-REQ-054)
CREATE TABLE "news_article_body" (
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paragraphs" JSONB NOT NULL DEFAULT '[]',
    "url" TEXT,
    "original_url" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "extractor_version" INTEGER NOT NULL,
    CONSTRAINT "news_article_body_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "news_article_body_status_check" CHECK ("status" IN ('ok', 'not_found', 'failed'))
);
