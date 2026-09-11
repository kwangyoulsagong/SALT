import type { ArticleRepository, ArticleSummary } from "../domain";

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
