import type {
  ArticleDetail,
  ArticleDraft,
  ArticleSummary,
  ArticleText,
  Paged,
  SourceCount,
} from "./Article";
import type { ArticleCandidate, StoredArticleBody } from "./ArticleBody";
import type { NewsLanguage } from "./NewsSource";

/**
 * `news` 가 밖에 요구하는 것 — Port 선언은 **domain 이 한다**.
 *
 * `application` 은 이 타입만 보고, 구현이 Prisma 인지 RSS 인지 모른다.
 * 그래서 `application` → `infrastructure` import 가 필요 없고, 훅이 그걸 막는다
 * (`server-architecture.md` §1).
 */

export interface SentimentArticleQuery {
  symbol: string;
  keywords: string[];
  since: Date;
  limit: number;
}

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
  /** 본문 찾기용 머리(제목 · 게시 시각) — 조회수를 올리지 않는다. 없으면 `null` */
  findHead(newsId: string): Promise<{ title: string; publishedAt: Date } | null>;
  findBySymbol(symbol: string, limit: number): Promise<ArticleSummary[]>;
  /**
   * 제목에 검색어가 든 기사(`since` 뒤 · 최신순 · `limit` 건) — 검색 모달 뉴스 묶음(`SRV-REQ-055`). 본문은 뒤지지 않는다
   * (검색은 타이핑마다 부른다 — 본문 `contains` 는 표 전체를 읽는다)
   */
  searchTitles(q: string, since: Date, limit: number): Promise<ArticleSummary[]>;
  /** 한 종목이 붙은 기사들의 태그 목록(`since` 뒤 · 최신순 · `limit` 건) — 함께 태그된 종목 세기(`SRV-REQ-055`) */
  symbolTagLists(symbol: string, since: Date, limit: number): Promise<string[][]>;
  /**
   * 감성 분석용 조회. 종목 태그(`symbols`)나 **검색어**로 찾고 본문까지 준다.
   *
   * 검색어 목록은 부르는 쪽(`coach`)이 준다 — "무엇을 그 종목 기사로 볼 것인가"는
   * `news` 의 판단이 아니다.
   */
  findForSentiment(query: SentimentArticleQuery): Promise<ArticleText[]>;
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

/**
 * 포털 뉴스 검색(`SRV-REQ-054`) — 제목으로 찾은 후보 기사. 키가 없으면 `enabled = false`(꺼진 채 기동 — 화면은 요약 · 원문 링크로).
 * 실패는 던진다(재시도 판단은 부르는 쪽 — 캐시에 "실패"로 남기고 잠시 뒤 다시)
 */
export interface ArticleSearchPort {
  readonly enabled: boolean;
  search(query: string): Promise<ArticleCandidate[]>;
}

/**
 * 기사 페이지에서 본문 문단을 뽑는다 — 포털이 품은 기사는 정해진 본문 칸, 언론사 원문은 읽기 모드 추출.
 * 본문을 못 찾으면 빈 배열 · 받지 못하면 던진다. 문단은 **글자만**(태그 · 스크립트 0)
 */
export interface ArticlePagePort {
  paragraphs(url: string, portal: boolean): Promise<string[]>;
}

/** 본문 캐시 — 키 하나에 한 행(다시 찾으면 덮어쓴다) */
export interface ArticleBodyStore {
  find(key: string): Promise<StoredArticleBody | null>;
  save(row: StoredArticleBody): Promise<void>;
}
