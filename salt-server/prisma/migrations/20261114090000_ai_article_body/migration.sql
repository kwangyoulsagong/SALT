-- SRV-REQ-058 AI 가 읽는 기사 본문 — 포털 검색을 거치지 않는 경로(매체 RSS 원문). 시장 층 · 사용자 열 0.
-- 되돌리기 = 표 다섯 지우기(다른 표가 참조하지 않는다).

-- 매체 판정 — 원본은 코드(`news/domain/Outlets.ts`), 회차마다 목록 + robots 판정으로 다시 쓴다
CREATE TABLE "news_outlet" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "robots_verdict" TEXT NOT NULL,
  "terms_verdict" TEXT NOT NULL,
  "terms_note" TEXT NOT NULL,
  "checked_at" TIMESTAMPTZ(3) NOT NULL
);

-- origin 마다 robots.txt 저장본(하루 한 번 다시 읽음)
CREATE TABLE "news_robots" (
  "origin" TEXT PRIMARY KEY,
  "status" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL
);

-- RSS 주소마다 조건부 GET 상태
CREATE TABLE "news_feed_state" (
  "url" TEXT PRIMARY KEY,
  "outlet_id" TEXT NOT NULL,
  "etag" TEXT,
  "last_modified" TEXT,
  "status" TEXT NOT NULL,
  "polled_at" TIMESTAMPTZ(3) NOT NULL
);

-- 매체 RSS 항목 — 제목 · 주소 · 시각만(본문 0) · 14일
CREATE TABLE "news_rss_item" (
  "url" TEXT PRIMARY KEY,
  "outlet_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "published_at" TIMESTAMPTZ(3) NOT NULL,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "news_rss_item_outlet_published_idx" ON "news_rss_item" ("outlet_id", "published_at");

-- AI 경로 본문 — 키는 사람용 본문과 같은 꼴(kr:<일련번호> · coin:<id>). 문단은 추출 뒤 또는 7일 뒤 지우고 해시 · 길이만
CREATE TABLE "news_ai_body" (
  "key" TEXT PRIMARY KEY,
  "market" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "title_published_at" TIMESTAMPTZ(3) NOT NULL,
  "outlet_id" TEXT,
  "via" TEXT,
  "status" TEXT NOT NULL,
  "item_url" TEXT,
  "paragraphs" JSONB NOT NULL DEFAULT '[]',
  "body_hash" TEXT,
  "body_chars" INTEGER,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_try_at" TIMESTAMPTZ(3),
  "linked_at" TIMESTAMPTZ(3) NOT NULL,
  "fetched_at" TIMESTAMPTZ(3),
  "extracted_at" TIMESTAMPTZ(3),
  "purged_at" TIMESTAMPTZ(3),
  CONSTRAINT "news_ai_body_via_check" CHECK ("via" IS NULL OR "via" IN ('rss_direct', 'dart', 'coin_rss', 'outlet_list', 'portal'))
);
-- 받을 행(pending · 다시 받을 failed) — 상태 먼저 · 다시 받을 시각
CREATE INDEX "news_ai_body_status_next_try_idx" ON "news_ai_body" ("status", "next_try_at");
-- 덮임률 · 상태 점검(시장 · 제목 시각)
CREATE INDEX "news_ai_body_market_published_idx" ON "news_ai_body" ("market", "title_published_at");
