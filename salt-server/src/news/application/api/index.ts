import type {
  ArticleBodyQuery,
  ArticleBodyStore,
  ArticleBodyView,
  ArticlePagePort,
  ArticleRepository,
  ArticleSearchPort,
  ArticleSummary,
  ArticleText,
  BookmarkRepository,
  NewsFeedPort,
  SentimentArticleQuery,
} from "../../domain";
import { CrawlKoreanNews, CrawlNews } from "../CrawlNews";
import { GetArticleBody, ReadArticleBody } from "../ReadArticleBody";
import {
  FindArticlesBySymbol,
  FindArticlesForSentiment,
} from "../FindArticlesBySymbol";
import {
  BookmarkArticle,
  ListBookmarks,
  RemoveBookmark,
} from "../ManageBookmarks";
import {
  GetArticle,
  ListArticles,
  ListNewsSources,
  ListTrendingArticles,
} from "../ReadArticles";

/**
 * `news` 의 **공개 API** — 컨텍스트 밖으로 열리는 유일한 지점 (FR-4).
 *
 * ## 밖에 여는 것과 자기 화면에 쓰는 것을 구분한다
 *
 * `NewsApi` 는 **다른 컨텍스트가 부르는 것**이다. 지금은 종목별 기사 하나뿐이고,
 * `market` 의 종목 상세와 `coach` 의 뉴스 분석이 이것을 부른다.
 *
 * 북마크·크롤링 같은 나머지는 `NewsUseCases` 에 있고 **이 컨텍스트의 `presentation`
 * 과 워커만** 쓴다. 둘을 한 덩어리로 내보내면 "공개 API"가 그냥 서비스 전체가 된다.
 */
export interface NewsApi {
  findArticlesBySymbol(symbol: string, limit?: number): Promise<ArticleSummary[]>;
  /** 감성 분석용. 본문을 포함하고 검색어를 부르는 쪽이 준다. */
  findArticlesForSentiment(query: SentimentArticleQuery): Promise<ArticleText[]>;
  /**
   * 기사 본문(`SRV-REQ-054`) — 제목 · 게시 시각으로 포털에서 같은 기사를 찾아 문단을 준다(캐시). `market` 의 국내 시황 제목이 부른다.
   * 키가 없으면 `NEWS_BODY_UNAVAILABLE`(503)
   */
  readArticleBody(query: ArticleBodyQuery): Promise<ArticleBodyView>;
}

export type { ArticleBodyQuery, ArticleBodyView, ArticleSummary, ArticleText, SentimentArticleQuery } from "../../domain";

export interface NewsDependencies {
  articles: ArticleRepository;
  bookmarks: BookmarkRepository;
  feed: NewsFeedPort;
  /** 기사 본문 — 포털 검색 · 페이지 추출 · 캐시(`SRV-REQ-054`) */
  body: { search: ArticleSearchPort; pages: ArticlePagePort; bodies: ArticleBodyStore };
}

export interface NewsUseCases {
  crawlNews: CrawlNews;
  crawlKoreanNews: CrawlKoreanNews;
  listArticles: ListArticles;
  getArticle: GetArticle;
  listTrendingArticles: ListTrendingArticles;
  listNewsSources: ListNewsSources;
  bookmarkArticle: BookmarkArticle;
  removeBookmark: RemoveBookmark;
  listBookmarks: ListBookmarks;
  getArticleBody: GetArticleBody;
}

/**
 * 조립 지점.
 *
 * ## 의존성 주입을 프레임워크로 하지 않는다 (Open Question 7-6 의 답)
 *
 * 컨테이너 라이브러리를 넣지 않고 **생성자 인자**로 넘긴다. 이유는 규칙 때문이다 —
 * `application` 은 `infrastructure` 를 import 할 수 없고(훅이 막는다) `presentation`
 * 도 마찬가지다. 그래서 **구현을 아는 자리는 진입점(`src/composition.ts`) 하나뿐**이고,
 * 거기서 이 팩토리에 넘긴다. 데코레이터·리플렉션을 쓰면 그 한 자리가 흩어진다.
 */
export const createNewsApplication = (deps: NewsDependencies) => {
  const findArticlesBySymbol = new FindArticlesBySymbol(deps.articles);
  const findArticlesForSentiment = new FindArticlesForSentiment(deps.articles);
  const readArticleBody = new ReadArticleBody(deps.body);

  const useCases: NewsUseCases = {
    crawlNews: new CrawlNews(deps.articles, deps.feed),
    crawlKoreanNews: new CrawlKoreanNews(deps.articles, deps.feed),
    listArticles: new ListArticles(deps.articles),
    getArticle: new GetArticle(deps.articles),
    listTrendingArticles: new ListTrendingArticles(deps.articles),
    listNewsSources: new ListNewsSources(deps.articles),
    bookmarkArticle: new BookmarkArticle(deps.articles, deps.bookmarks),
    removeBookmark: new RemoveBookmark(deps.bookmarks),
    listBookmarks: new ListBookmarks(deps.bookmarks),
    getArticleBody: new GetArticleBody(deps.articles, readArticleBody),
  };

  const api: NewsApi = {
    findArticlesBySymbol: (symbol, limit) =>
      findArticlesBySymbol.execute(symbol, limit),
    findArticlesForSentiment: (query) => findArticlesForSentiment.execute(query),
    readArticleBody: (query) => readArticleBody.execute(query),
  };

  return { api, useCases };
};
