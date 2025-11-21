import prisma from '../../config/database';
import { newsAPIService, NewsItem } from '../../external/news-api.service';
import { NotFoundError } from '../../utils/error.util';
import { logger } from '../../config/logger';

export class NewsService {
  /**
   * 뉴스 크롤링 & DB 저장
   */
  async crawlAndSaveNews() {
    logger.info('🔄 Starting news crawling...');

    const newsItems = await newsAPIService.fetchAllNews();
    let savedCount = 0;
    let skippedCount = 0;

    for (const item of newsItems) {
      try {
        // 중복 체크 (URL 기준)
        const exists = await prisma.newsArticle.findUnique({
          where: { url: item.url },
        });

        if (exists) {
          skippedCount++;
          continue;
        }

        // 저장
        await prisma.newsArticle.create({
          data: {
            title: item.title,
            content: item.content,
            summary: item.summary,
            url: item.url,
            imageUrl: item.imageUrl,
            source: item.source,
            author: item.author,
            symbols: item.symbols,
            sentiment: item.sentiment,
            publishedAt: item.publishedAt,
          },
        });

        savedCount++;
      } catch (error: any) {
        logger.error(`Failed to save news: ${item.url}`, error.message);
      }
    }

    logger.info(`✅ News crawling completed: ${savedCount} saved, ${skippedCount} skipped`);
    return { savedCount, skippedCount, total: newsItems.length };
  }

  /**
   * 뉴스 목록 조회
   */
  async getNews(query: {
    symbol?: string;
    source?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.symbol) {
      where.symbols = {
        has: query.symbol.toUpperCase(),
      };
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
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
          viewCount: true,
          publishedAt: true,
        },
      }),
      prisma.newsArticle.count({ where }),
    ]);

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 뉴스 상세 조회
   */
  async getNewsById(newsId: string) {
    const article = await prisma.newsArticle.findUnique({
      where: { id: newsId },
    });

    if (!article) {
      throw new NotFoundError('News article not found');
    }

    // 조회수 증가
    await prisma.newsArticle.update({
      where: { id: newsId },
      data: { viewCount: { increment: 1 } },
    });

    return article;
  }

  /**
   * 뉴스 북마크 추가
   */
  async bookmarkNews(userId: string, newsId: string) {
    // 뉴스 존재 확인
    const article = await prisma.newsArticle.findUnique({
      where: { id: newsId },
    });

    if (!article) {
      throw new NotFoundError('News article not found');
    }

    // 이미 북마크되어 있는지 확인
    const exists = await prisma.newsBookmark.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    });

    if (exists) {
      return { message: 'Already bookmarked' };
    }

    await prisma.newsBookmark.create({
      data: {
        userId,
        newsId,
      },
    });

    return { message: 'Bookmark added successfully' };
  }

  /**
   * 뉴스 북마크 삭제
   */
  async removeBookmark(userId: string, newsId: string) {
    const bookmark = await prisma.newsBookmark.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundError('Bookmark not found');
    }

    await prisma.newsBookmark.delete({
      where: { id: bookmark.id },
    });

    return { message: 'Bookmark removed successfully' };
  }

  /**
   * 내 북마크 목록 조회
   */
  async getMyBookmarks(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.newsBookmark.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      bookmarks: bookmarks.map((b) => b.news),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 인기 뉴스 (조회수 순)
   */
  async getTrendingNews(limit: number = 10) {
    const articles = await prisma.newsArticle.findMany({
      take: limit,
      orderBy: { viewCount: 'desc' },
      where: {
        publishedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 최근 7일
        },
      },
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        imageUrl: true,
        source: true,
        symbols: true,
        viewCount: true,
        publishedAt: true,
      },
    });

    return articles;
  }
}
