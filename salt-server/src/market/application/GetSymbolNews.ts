import type { SymbolNewsPort } from "../domain";
import type { TagNews } from "./TagNews";

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
  constructor(
    private readonly news: SymbolNewsPort,
    /** 소식 측정 태그(F017 단계 6). 없으면 태그 없음(테스트) */
    private readonly tagNews?: Pick<TagNews, "execute">
  ) {}

  async execute(symbol: string, limit = 3) {
    const upperSymbol = symbol.toUpperCase();
    const found = await this.news.recent(upperSymbol, limit);
    const tags = this.tagNews
      ? await this.tagNews.execute(
          "crypto",
          found.map((a) => ({
            id: a.id,
            symbol: upperSymbol,
            origin: "news" as const,
            related: a.symbols ?? [upperSymbol],
            title: a.title,
            publishedAt: a.publishedAt,
          }))
        )
      : null;
    // 태그는 덧붙임 — 행 모양은 그대로(측정 태그 F017 단계 6). 원천 심볼 목록은 응답에 싣지 않는다(쓰는 화면이 없다)
    const articles = found.map(({ symbols: _symbols, ...a }) => ({ ...a, tag: tags?.get(a.id) ?? null }));

    return {
      symbol: upperSymbol,
      articles,
      status: articles.length ? "active" : "empty",
      generatedAt: new Date().toISOString(),
    };
  }
}
