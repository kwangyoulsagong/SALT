import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import {
  KOREAN_SOURCES,
  type ArticleDetail,
  type ArticleDraft,
  type ArticleRepository,
  type ArticleSummary,
  type ListArticlesFilter,
  type NewsLanguage,
  type Paged,
  type SourceCount,
} from "../domain";

/** 목록 응답의 컬럼. 본문(`content`)을 싣지 않는다 (FR-43). */
const SUMMARY_SELECT = {
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
} satisfies Prisma.NewsArticleSelect;

/** 언어 필터를 `source` 조건으로 옮긴다. 목록과 인기 뉴스가 같은 함수를 쓴다. */
const languageCondition = (language?: NewsLanguage) => {
  if (language === "ko") return { in: [...KOREAN_SOURCES] };
  if (language === "en") return { notIn: [...KOREAN_SOURCES] };
  return undefined;
};

const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export class PrismaArticleRepository implements ArticleRepository {
  async findMany(filter: ListArticlesFilter): Promise<Paged<ArticleSummary>> {
    const skip = (filter.page - 1) * filter.limit;
    const where: Prisma.NewsArticleWhereInput = {};

    if (filter.symbol) where.symbols = { has: filter.symbol.toUpperCase() };
    if (filter.source) where.source = filter.source;

    const byLanguage = languageCondition(filter.language);
    if (byLanguage) where.source = byLanguage;

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: "insensitive" } },
        { content: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { publishedAt: "desc" },
        select: SUMMARY_SELECT,
      }),
      prisma.newsArticle.count({ where }),
    ]);

    return {
      articles,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  /**
   * 상세 + 조회수 증가.
   *
   * 원문은 조회 후 별도 `update` 로 올렸다. `update` 는 행이 없으면 던지므로
   * **조회 한 번으로 끝낸다** — 없으면 `null` 을 주고 유스케이스가 예외를 만든다.
   * 응답은 증가 전 값이고 그것도 원문과 같다.
   */
  async findByIdAndCountView(newsId: string): Promise<ArticleDetail | null> {
    const article = await prisma.newsArticle.findUnique({
      where: { id: newsId },
    });
    if (!article) return null;

    await prisma.newsArticle.update({
      where: { id: newsId },
      data: { viewCount: { increment: 1 } },
    });

    return article;
  }

  async exists(newsId: string): Promise<boolean> {
    const found = await prisma.newsArticle.findUnique({
      where: { id: newsId },
      select: { id: true },
    });
    return found !== null;
  }

  findBySymbol(symbol: string, limit: number): Promise<ArticleSummary[]> {
    return prisma.newsArticle.findMany({
      where: { symbols: { has: symbol } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        source: true,
        sentiment: true,
        publishedAt: true,
      },
    });
  }

  findTrending(limit: number, language?: NewsLanguage) {
    const where: Prisma.NewsArticleWhereInput = {
      publishedAt: { gte: new Date(Date.now() - TRENDING_WINDOW_MS) },
    };

    const byLanguage = languageCondition(language);
    if (byLanguage) where.source = byLanguage;

    return prisma.newsArticle.findMany({
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
  }

  /**
   * Prisma `groupBy` 의 반환 타입이 인자 리터럴에서 역으로 추론된다. 메서드에 반환 타입을
   * 달면 그 추론이 인자 검사로 되돌아와 깨지므로, **호출 결과를 받아서** 좁힌다.
   */
  async countBySource(): Promise<SourceCount[]> {
    const rows = await prisma.newsArticle.groupBy({
      by: ["source"],
      _count: { source: true },
      orderBy: { _count: { source: "desc" } },
    });
    return rows;
  }

  async saveIfNew(draft: ArticleDraft): Promise<boolean> {
    const exists = await prisma.newsArticle.findUnique({
      where: { url: draft.url },
      select: { id: true },
    });
    if (exists) return false;

    await prisma.newsArticle.create({
      data: {
        title: draft.title,
        content: draft.content,
        summary: draft.summary,
        url: draft.url,
        imageUrl: draft.imageUrl,
        source: draft.source,
        author: draft.author,
        symbols: draft.symbols,
        sentiment: draft.sentiment,
        publishedAt: draft.publishedAt,
      },
    });
    return true;
  }
}
