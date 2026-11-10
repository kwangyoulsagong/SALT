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

/** 제목 검색 · 태그 목록 한 번에 읽는 최대 기사 수 — 함께 태그 세기가 기사 수백 건을 넘게 읽지 않게 */
export const TAG_LIST_MAX = 300;

/**
 * 검색 모달 뉴스 묶음 · 곁 칸(`SRV-REQ-055`) — **컨텍스트 밖에서 부르는 유스케이스**다(`market` 의 검색이 부른다).
 * 검색어 앞뒤 공백은 지우고, 비면 읽지 않는다. 심볼은 대문자로(태그가 대문자다)
 */
export class SearchArticleTitles {
  constructor(private readonly articles: ArticleRepository) {}

  execute(q: string, since: Date, limit: number): Promise<ArticleSummary[]> {
    const needle = q.trim();
    return needle === "" ? Promise.resolve([]) : this.articles.searchTitles(needle, since, limit);
  }
}

export class ListSymbolTagLists {
  constructor(private readonly articles: ArticleRepository) {}

  execute(symbol: string, since: Date, limit: number): Promise<string[][]> {
    return this.articles.symbolTagLists(symbol.toUpperCase(), since, Math.min(limit, TAG_LIST_MAX));
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
