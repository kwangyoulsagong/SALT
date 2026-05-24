-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT NOT NULL,
    "image_url" TEXT,
    "source" TEXT NOT NULL,
    "author" TEXT,
    "symbols" TEXT[],
    "sentiment" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles"("url");

-- CreateIndex
CREATE INDEX "news_articles_published_at_idx" ON "news_articles"("published_at");

-- CreateIndex
CREATE INDEX "news_articles_source_idx" ON "news_articles"("source");

-- CreateIndex
CREATE INDEX "news_articles_symbols_idx" ON "news_articles"("symbols");

-- CreateIndex
CREATE INDEX "news_bookmarks_user_id_idx" ON "news_bookmarks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_bookmarks_user_id_news_id_key" ON "news_bookmarks"("user_id", "news_id");

-- AddForeignKey
ALTER TABLE "news_bookmarks" ADD CONSTRAINT "news_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_bookmarks" ADD CONSTRAINT "news_bookmarks_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
