import {
  ArticleNotFoundError,
  isKoreanSource,
  type ArticleRepository,
  type ListArticlesFilter,
  type NewsLanguage,
} from "../domain";

/** 목록 조회. 페이지 기본값은 원문과 같다 (`page=1` · `limit=20`). */
export class ListArticles {
  constructor(private readonly articles: ArticleRepository) {}

  execute(query: Partial<ListArticlesFilter> = {}) {
    return this.articles.findMany({
      ...query,
      page: query.page || 1,
      limit: query.limit || 20,
    });
  }
}

/**
 * 상세 조회 + 조회수 증가.
 *
 * 원문은 `findUnique` 로 없으면 던지고 그 다음 `update` 로 조회수를 올렸다 —
 * **두 번 왕복**한다. Port 를 `findByIdAndCountView` 한 개로 선언해 그 판단을
 * `infrastructure` 에 남겼다. 응답은 증가 **전** 값이다(원문 동일).
 */
export class GetArticle {
  constructor(private readonly articles: ArticleRepository) {}

  async execute(newsId: string) {
    const article = await this.articles.findByIdAndCountView(newsId);
    if (!article) throw new ArticleNotFoundError();
    return article;
  }
}

/** 인기 뉴스 — 최근 7일 안에서 조회수 순. 기간 규칙은 `infrastructure` 가 아니라 여기다. */
export class ListTrendingArticles {
  constructor(private readonly articles: ArticleRepository) {}

  execute(limit = 10, language?: NewsLanguage) {
    return this.articles.findTrending(limit, language);
  }
}

/** 소스 목록을 한글·영문으로 나눈다. 분류 규칙은 `domain/NewsSource` 하나다. */
export class ListNewsSources {
  constructor(private readonly articles: ArticleRepository) {}

  async execute() {
    const sources = await this.articles.countBySource();

    return {
      korean: sources.filter((s) => isKoreanSource(s.source)),
      english: sources.filter((s) => !isKoreanSource(s.source)),
      all: sources,
    };
  }
}
