import type { SymbolNewsPort } from "../domain";

/**
 * 종목 뉴스.
 *
 * ## 남의 테이블을 뒤지지 않는다
 *
 * 원문은 `market-intelligence.service` 가 `prisma.newsArticle` 을 직접 조회했다.
 * 기사 조회 규칙(심볼 매칭·정렬·노출 컬럼)이 `news` 와 `market` 두 곳에 복사돼 있었고,
 * 한쪽만 고치면 같은 질문에 다른 답이 나온다.
 *
 * 이제 `SymbolNewsPort` 로 선언하고 `infrastructure` 의 ACL 이 `news` 의 공개 API 를
 * 부른다 (`server-architecture.md` §4).
 */
export class GetSymbolNews {
  constructor(private readonly news: SymbolNewsPort) {}

  async execute(symbol: string, limit = 3) {
    const upperSymbol = symbol.toUpperCase();
    const articles = await this.news.recent(upperSymbol, limit);

    return {
      symbol: upperSymbol,
      articles,
      status: articles.length ? "active" : "empty",
      generatedAt: new Date().toISOString(),
    };
  }
}
