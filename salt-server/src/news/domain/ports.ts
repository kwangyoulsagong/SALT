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

// ── AI 가 읽는 기사 본문(`SRV-REQ-058`) — 포털 검색 API 를 거치지 않는 경로만 ─────────────────────────────

/** 본문을 찾을 제목들 — 국내 시황 제목(`market` 공개 API) + 코인 원장. 관련 종목 1~2개 · 광고 아님 · 공시 아님 */
export interface AiTitleSource {
  recentTitles(since: Date): Promise<import("./AiBody").AiTitle[]>;
}

export type OutletFeedResult =
  | { status: "not_modified" }
  | { status: "ok"; items: Array<{ title: string; url: string; publishedAt: Date }>; etag: string | null; lastModified: string | null };

/** 매체 RSS · robots 받기 — 실패는 던진다(부르는 쪽이 매체 하나만 건너뛴다) */
export interface OutletFeedPort {
  fetchFeed(url: string, state: { etag: string | null; lastModified: string | null } | null): Promise<OutletFeedResult>;
  /** robots.txt — 연결 실패는 `status: 0`(던지지 않는다 — 판정이 "막힘"으로 읽는다) */
  fetchRobots(origin: string): Promise<import("./Robots").RobotsSnapshot>;
}

export interface OutletRow {
  id: string;
  name: string;
  market: "kr" | "coin";
  enabled: boolean;
  robotsVerdict: import("./Robots").RobotsVerdict | "no_feed";
  termsVerdict: import("./Outlets").OutletTermsVerdict;
  termsNote: string;
}

/** 매체 · robots · RSS 상태 · RSS 항목 */
export interface AiSourceStore {
  syncOutlets(rows: OutletRow[], at: Date): Promise<void>;
  enabledOutletIds(): Promise<Set<string>>;
  robots(origin: string): Promise<{ snapshot: import("./Robots").RobotsSnapshot; fetchedAt: Date } | null>;
  saveRobots(origin: string, snapshot: import("./Robots").RobotsSnapshot, at: Date): Promise<void>;
  feedState(url: string): Promise<{ etag: string | null; lastModified: string | null } | null>;
  saveFeedState(url: string, outletId: string, state: { etag: string | null; lastModified: string | null; status: string }, at: Date): Promise<void>;
  /** 한 문장 · 같은 주소 한 번(`ON CONFLICT DO NOTHING`) — 넣은 수 */
  saveItems(items: import("./AiBody").RssItem[], at: Date): Promise<number>;
  recentItems(outletIds: string[], since: Date): Promise<import("./AiBody").RssItem[]>;
  pruneItems(before: Date): Promise<number>;
}

export interface AiBodyDue {
  key: string;
  outletId: string;
  itemUrl: string;
  title: string;
  attempts: number;
}

/** AI 경로 본문 행 — 사실 추출(`SRV-REQ-053` FR-14)은 `via ≠ portal` 행만 읽는다 */
export interface AiBodyStore {
  statuses(keys: string[]): Promise<Map<string, import("./AiBody").AiBodyStatus>>;
  /** 한 문장 upsert — 끝난 행(`ok` · `pending` · `failed` …)은 덮지 않는다(`WHERE` 로 다시 볼 상태만) */
  saveLinks(links: import("./AiBody").AiBodyLink[], at: Date): Promise<void>;
  dueForFetch(limit: number, now: Date): Promise<AiBodyDue[]>;
  saveFetched(
    key: string,
    result:
      | { status: "ok"; paragraphs: string[]; hash: string; chars: number }
      | { status: "empty" | "robots_blocked" }
      | { status: "failed"; attempts: number; nextTryAt: Date | null },
    at: Date,
  ): Promise<void>;
  /** 추출 대기 — 받았고(`ok`) · 문단이 있고 · 추출 전 · AI 경로(`isAiReadable`) · 시도 상한 안. 오래된 것부터 */
  pendingExtraction(limit: number): Promise<import("./AiBody").AiBodyForExtraction[]>;
  /** 추출 끝(`done`) 또는 실패 한 번(`failed` — 상한이면 끝으로 친다) */
  markExtraction(key: string, outcome: "done" | "failed", at: Date): Promise<void>;
  /** 공시 원문 행(`via: dart`, 받은 채 `ok`) — 같은 키는 한 번(`ON CONFLICT DO NOTHING`). 넣은 수 */
  saveDisclosures(rows: Array<{ key: string; title: string; publishedAt: Date; symbols: string[]; url: string; paragraphs: string[]; hash: string; chars: number }>, at: Date): Promise<number>;
  /** 문단을 지우고 해시 · 길이만 — 추출이 끝났거나 보관 기한이 지난 행. 지운 수 */
  purgeParagraphs(before: Date, at: Date): Promise<number>;
}

// ── DART 공시(F017 v4 2b) ─────────────────────────────────────────────────────

/** OpenDART — 목록 한 쪽 · 원문 한 건. 키가 없으면 조립에서 빠진다(포트 자체가 없음). 실패는 던진다 */
export interface DartPort {
  list(type: import("./Dart").DartType, bgnDe: string, endDe: string, page: number): Promise<{ items: import("./Dart").DartFiling[]; totalPage: number }>;
  /** 원문(본문 문서 HTML) — 문단으로 바꾼 것 */
  document(rceptNo: string): Promise<string[]>;
  /** 종목 코드 → 고유번호(상장사, 하루 캐시) — 기간이 3개월을 넘는 목록은 고유번호가 있어야 한다 */
  corpCodes(): Promise<Map<string, string>>;
  /** 한 회사의 목록 한 쪽 */
  listByCorp(corpCode: string, type: import("./Dart").DartType, bgnDe: string, endDe: string, page: number): Promise<{ items: import("./Dart").DartFiling[]; totalPage: number }>;
}

/** 공시 목록 저장(`dart_filing`) · 백필 표시(`dart_backfill`) */
export interface DartFilingStore {
  /** 한 문장 · 같은 접수번호 한 번. 넣은 수 */
  save(filings: Array<import("./Dart").DartFiling & { type: import("./Dart").DartType }>, at: Date): Promise<number>;
  backfilled(codes: string[]): Promise<Set<string>>;
  markBackfilled(code: string, filings: number, at: Date): Promise<void>;
  /** 원문을 아직 안 받은(`news_ai_body` 행 없음) 공시 — `since` 뒤 · 최신순(고르는 규칙은 부르는 쪽 `isImportantFiling`) */
  withoutBody(codes: string[], since: Date): Promise<import("./Dart").DartFiling[]>;
  /** 한 종목 공시 목록(최신순) */
  recent(code: string, since: Date, limit: number): Promise<import("./Dart").StoredDartFiling[]>;
}

/** 국내 판단 유니버스(상위 N + 보유) — `market` 공개 API */
export interface KrUniverseSource {
  codes(): Promise<string[]>;
}
