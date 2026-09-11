import type {
  ArticleDetail,
  ArticleDraft,
  ArticleSummary,
  Paged,
  SourceCount,
} from "./Article";
import type { NewsLanguage } from "./NewsSource";

/**
 * `news` 가 밖에 요구하는 것 — Port 선언은 **domain 이 한다**.
 *
 * `application` 은 이 타입만 보고, 구현이 Prisma 인지 RSS 인지 모른다.
 * 그래서 `application` → `infrastructure` import 가 필요 없고, 훅이 그걸 막는다
 * (`server-architecture.md` §1).
 */

export interface ListArticlesFilter {
  symbol?: string;
  source?: string;
  search?: string;
  language?: NewsLanguage;
  page: number;
  limit: number;
}

/**
 * 목록·집계용 조회 Port (FR-43).
 *
 * **Aggregate 를 로드하지 않는다** — 목록은 요약 행만 읽는다.
 */
export interface ArticleRepository {
  findMany(filter: ListArticlesFilter): Promise<Paged<ArticleSummary>>;
  /** 조회수를 올리고 상세를 준다. 없으면 `null`. */
  findByIdAndCountView(newsId: string): Promise<ArticleDetail | null>;
  exists(newsId: string): Promise<boolean>;
  findBySymbol(symbol: string, limit: number): Promise<ArticleSummary[]>;
  findTrending(limit: number, language?: NewsLanguage): Promise<ArticleSummary[]>;
  countBySource(): Promise<SourceCount[]>;
  /** URL 이 이미 있으면 저장하지 않고 `false`. 유일성은 DB 제약이 지킨다. */
  saveIfNew(draft: ArticleDraft): Promise<boolean>;
}

export interface BookmarkRepository {
  exists(userId: string, newsId: string): Promise<boolean>;
  add(userId: string, newsId: string): Promise<void>;
  remove(userId: string, newsId: string): Promise<boolean>;
  listArticles(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ articles: ArticleSummary[]; total: number }>;
}

/** 외부 뉴스 수집. 실패해도 빈 배열을 주는 것이 계약이다 — 한 소스가 죽어도 나머지를 저장한다. */
export interface NewsFeedPort {
  fetchEnglish(): Promise<ArticleDraft[]>;
  fetchKorean(): Promise<ArticleDraft[]>;
}
