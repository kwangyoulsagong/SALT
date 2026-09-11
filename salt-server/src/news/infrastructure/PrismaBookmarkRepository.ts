import prisma from "../../shared/infrastructure/prisma";
import type { ArticleSummary, BookmarkRepository } from "../domain";

export class PrismaBookmarkRepository implements BookmarkRepository {
  async exists(userId: string, newsId: string): Promise<boolean> {
    const found = await prisma.newsBookmark.findUnique({
      where: { userId_newsId: { userId, newsId } },
      select: { id: true },
    });
    return found !== null;
  }

  async add(userId: string, newsId: string): Promise<void> {
    await prisma.newsBookmark.create({ data: { userId, newsId } });
  }

  /**
   * 유니크 키로 바로 지운다.
   *
   * 원문은 `findUnique` → `delete({ id })` 두 번 왕복했다. `deleteMany` 는 지운 행 수를
   * 주므로 **없었다는 사실을 왕복 한 번으로 알 수 있다.**
   */
  async remove(userId: string, newsId: string): Promise<boolean> {
    const { count } = await prisma.newsBookmark.deleteMany({
      where: { userId, newsId },
    });
    return count > 0;
  }

  async listArticles(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.newsBookmark.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          news: {
            select: {
              id: true,
              title: true,
              summary: true,
              url: true,
              imageUrl: true,
              source: true,
              author: true,
              symbols: true,
              sentiment: true,
              publishedAt: true,
            },
          },
        },
      }),
      prisma.newsBookmark.count({ where: { userId } }),
    ]);

    return {
      articles: bookmarks.map((b) => b.news) as ArticleSummary[],
      total,
    };
  }
}
