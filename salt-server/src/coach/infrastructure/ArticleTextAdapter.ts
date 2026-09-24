import type { NewsApi } from "../../news/application/api";
import type { CoachArticle, CoachArticleQuery, CoachSymbolArticle, NewsProbe } from "../domain";

/**
 * `news` → `coach` ACL.
 *
 * 원문(`news-analysis.service`)은 `prisma.newsArticle` 을 직접 뒤졌고, 24시간 창과
 * 키워드 `OR` 필터가 `news` 밖에 있었다. 조회는 `news` 로 가고 **무엇을 그 종목
 * 기사로 볼 것인가(키워드 표)는 `coach` 에 남는다** — 그것은 판단이다.
 */
export class ArticleTextAdapter implements NewsProbe {
  constructor(private readonly news: NewsApi) {}

  async findArticlesForSentiment(
    query: CoachArticleQuery
  ): Promise<CoachArticle[]> {
    const articles = await this.news.findArticlesForSentiment(query);

    return articles.map((article) => ({
      title: article.title,
      summary: article.summary,
      content: article.content,
      sentiment: article.sentiment,
      publishedAt: article.publishedAt,
    }));
  }

  async recentForSymbol(symbol: string, limit: number): Promise<CoachSymbolArticle[]> {
    const articles = await this.news.findArticlesBySymbol(symbol, limit);
    return articles.map((article) => ({
      title: article.title,
      summary: article.summary,
      source: article.source,
      sentiment: article.sentiment ?? null,
    }));
  }
}
