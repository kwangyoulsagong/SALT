import type { NewsApi } from "../../news/application/api";
import type { SymbolNewsItem, SymbolNewsPort } from "../domain";

/**
 * `news` 를 우리 언어로 번역하는 **ACL** (`ddd-infrastructure.md` §5).
 *
 * ## 이름에 컨텍스트를 쓰지 않았다
 *
 * `NewsContextAdapter` 가 아니라 `SymbolNewsAdapter` 다 — **무엇을 감싸는지가 아니라
 * 무엇을 가져오는지**가 이름이다. 나중에 종목 뉴스가 다른 소스에서 오면 이 파일만 바뀐다.
 *
 * 여기가 `market` 이 `news` 를 아는 **유일한 지점**이고, `application` 은 `SymbolNewsPort`
 * 만 본다.
 */
export class SymbolNewsAdapter implements SymbolNewsPort {
  constructor(private readonly news: NewsApi) {}

  async recent(symbol: string, limit: number): Promise<SymbolNewsItem[]> {
    const articles = await this.news.findArticlesBySymbol(symbol, limit);

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      summary: article.summary,
      url: article.url,
      source: article.source,
      sentiment: article.sentiment,
      publishedAt: article.publishedAt,
    }));
  }
}
