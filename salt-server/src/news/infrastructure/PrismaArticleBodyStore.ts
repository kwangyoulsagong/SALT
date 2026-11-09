import prisma from "../../shared/infrastructure/prisma";
import type { ArticleBodyStatus, ArticleBodyStore, StoredArticleBody } from "../domain";

const STATUSES: readonly ArticleBodyStatus[] = ["ok", "not_found", "failed"];

/** 기사 본문 캐시(`news_article_body`) — 키 하나에 한 행. 다시 찾으면 덮어쓴다(한 문장 upsert — 동시 첫 저장도 ON CONFLICT 로 끝난다) */
export class PrismaArticleBodyStore implements ArticleBodyStore {
  async find(key: string): Promise<StoredArticleBody | null> {
    const row = await prisma.newsArticleBody.findUnique({ where: { key } });
    if (!row || !STATUSES.includes(row.status as ArticleBodyStatus)) return null;
    const paragraphs = Array.isArray(row.paragraphs) ? row.paragraphs.filter((p): p is string => typeof p === "string") : [];
    return {
      key: row.key,
      status: row.status as ArticleBodyStatus,
      paragraphs,
      url: row.url,
      originalUrl: row.originalUrl,
      fetchedAt: row.fetchedAt,
      version: row.extractorVersion,
    };
  }

  async save(row: StoredArticleBody): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO news_article_body (key, status, paragraphs, url, original_url, fetched_at, extractor_version)
      VALUES (${row.key}, ${row.status}, ${JSON.stringify(row.paragraphs)}::jsonb, ${row.url}, ${row.originalUrl}, ${row.fetchedAt}, ${row.version})
      ON CONFLICT (key) DO UPDATE SET status = EXCLUDED.status, paragraphs = EXCLUDED.paragraphs, url = EXCLUDED.url,
        original_url = EXCLUDED.original_url, fetched_at = EXCLUDED.fetched_at, extractor_version = EXCLUDED.extractor_version`;
  }
}
