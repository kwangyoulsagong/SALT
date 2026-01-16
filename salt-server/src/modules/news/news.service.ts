import prisma from "../../config/database";
import { newsAPIService, NewsItem } from "../../external/news-api.service";

import { NotFoundError } from "../../utils/error.util";
import { logger } from "../../config/logger";
import { koreanNewsService } from "../../external/korean-news.service";

export class NewsService {
  /**
   * 뉴스 크롤링 & DB 저장 (영문 + 한글)
   */
  async crawlAndSaveNews() {
    logger.info("🔄 Starting news crawling (English + Korean)...");

    // 영문 뉴스 + 한글 뉴스 동시 크롤링
    const [englishNews, koreanNews] = await Promise.all([
      newsAPIService.fetchAllNews(),
      koreanNewsService.fetchAllKoreanNews(),
    ]);

    const allNews = [...englishNews, ...koreanNews];
    let savedCount = 0;
    let skippedCount = 0;

    for (const item of allNews) {
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

    logger.info(
      `✅ News crawling completed: ${savedCount} saved, ${skippedCount} skipped`
    );
    logger.info(
      `📊 English: ${englishNews.length}, Korean: ${koreanNews.length}`
    );

    return {
      savedCount,
      skippedCount,
      total: allNews.length,
      english: englishNews.length,
      korean: koreanNews.length,
    };
  }

  /**
   * 한글 뉴스만 크롤링
   */
  async crawlKoreanNewsOnly() {
    logger.info("🇰🇷 Starting Korean news crawling...");

    const koreanNews = await koreanNewsService.fetchAllKoreanNews();
    let savedCount = 0;
    let skippedCount = 0;

    for (const item of koreanNews) {
      try {
        const exists = await prisma.newsArticle.findUnique({
          where: { url: item.url },
        });

        if (exists) {
          skippedCount++;
          continue;
        }

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
        logger.error(`Failed to save Korean news: ${item.url}`, error.message);
      }
    }

    logger.info(
      `✅ Korean news crawling completed: ${savedCount} saved, ${skippedCount} skipped`
    );
    return { savedCount, skippedCount, total: koreanNews.length };
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
    language?: "ko" | "en" | "all"; // 언어 필터 추가
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

    // 언어 필터
    if (query.language === "ko") {
      where.source = {
        in: ["토큰포스트", "비인크립토", "블록미디어", "코인리더스"],
      };
    } else if (query.language === "en") {
      where.source = {
        notIn: ["토큰포스트", "비인크립토", "블록미디어", "코인리더스"],
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: "desc" },
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
      throw new NotFoundError("News article not found");
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
    const article = await prisma.newsArticle.findUnique({
      where: { id: newsId },
    });

    if (!article) {
      throw new NotFoundError("News article not found");
    }

    const exists = await prisma.newsBookmark.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    });

    if (exists) {
      return { message: "Already bookmarked" };
    }

    await prisma.newsBookmark.create({
      data: {
        userId,
        newsId,
      },
    });

    return { message: "Bookmark added successfully" };
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
      throw new NotFoundError("Bookmark not found");
    }

    await prisma.newsBookmark.delete({
      where: { id: bookmark.id },
    });

    return { message: "Bookmark removed successfully" };
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
  async getTrendingNews(limit: number = 10, language?: "ko" | "en") {
    const where: any = {
      publishedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 최근 7일
      },
    };

    if (language === "ko") {
      where.source = {
        in: ["토큰포스트", "비인크립토", "블록미디어", "코인리더스"],
      };
    } else if (language === "en") {
      where.source = {
        notIn: ["토큰포스트", "비인크립토", "블록미디어", "코인리더스"],
      };
    }

    const articles = await prisma.newsArticle.findMany({
      where,
      take: limit,
      orderBy: { viewCount: "desc" },
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

  /**
   * 뉴스 소스 목록 (한글/영문 구분)
   */
  async getNewsSources() {
    const sources = await prisma.newsArticle.groupBy({
      by: ["source"],
      _count: {
        source: true,
      },
      orderBy: {
        _count: {
          source: "desc",
        },
      },
    });

    const korean = sources.filter((s) =>
      ["토큰포스트", "비인크립토", "블록미디어", "코인리더스"].includes(
        s.source
      )
    );

    const english = sources.filter(
      (s) =>
        !["토큰포스트", "비인크립토", "블록미디어", "코인리더스"].includes(
          s.source
        )
    );

    return {
      korean,
      english,
      all: sources,
    };
  }
}
