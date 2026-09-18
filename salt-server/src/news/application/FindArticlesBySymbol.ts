import type {
  ArticleRepository,
  ArticleSummary,
  ArticleText,
  SentimentArticleQuery,
} from "../domain";

/**
 * 종목별 최근 기사 — **컨텍스트 밖에서 부르는 유스케이스**다.
 *
 * `market` 의 종목 상세와 `coach` 의 뉴스 분석이 둘 다 이것을 부른다. 원문에서는
 * 그 둘이 각자 `prisma.newsArticle` 을 직접 뒤졌고, 그래서 `symbols has` 조건과
 * 정렬·`select` 가 세 곳에 복사돼 있었다.
 */
export class FindArticlesBySymbol {
  constructor(private readonly articles: ArticleRepository) {}

  execute(symbol: string, limit = 3): Promise<ArticleSummary[]> {
    return this.articles.findBySymbol(symbol.toUpperCase(), limit);
  }
}

/**
 * 감성 분석용 기사 — **컨텍스트 밖에서 부르는 유스케이스**다.
 *
 * `coach` 의 뉴스 감성이 이것을 부른다. 원문(`news-analysis.service`)은
 * `prisma.newsArticle` 을 직접 뒤졌고, 그래서 24시간 창과 키워드 필터가
 * `news` 밖에 있었다. 조회는 여기로 오고 **판단(키워드 표)은 `coach` 에 남는다.**
 */
export class FindArticlesForSentiment {
  constructor(private readonly articles: ArticleRepository) {}

  execute(query: SentimentArticleQuery): Promise<ArticleText[]> {
    return this.articles.findForSentiment({
      ...query,
      symbol: query.symbol.toUpperCase(),
    });
  }
}
