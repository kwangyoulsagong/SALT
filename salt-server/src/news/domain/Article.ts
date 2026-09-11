/**
 * 기사 — `news` 컨텍스트의 모델.
 *
 * Aggregate 를 만들지 않았다. 이 컨텍스트가 지키는 불변식은 **URL 유일성** 하나이고
 * 그건 DB 유니크 제약이다. 행동이 없는 데이터에 클래스를 씌우면 이름만 늘어난다
 * (`ddd-domain.md` — "Aggregate 는 불변식이 있을 때 만든다").
 */

/** 수집된 기사. 저장 전 상태라 `id` 와 조회수가 없다. */
export interface ArticleDraft {
  title: string;
  content: string;
  summary?: string;
  url: string;
  imageUrl?: string;
  source: string;
  author?: string;
  symbols: string[];
  sentiment?: ArticleSentiment;
  publishedAt: Date;
}

export type ArticleSentiment = "positive" | "neutral" | "negative";

/** 목록에 쓰는 요약. 본문(`content`)을 싣지 않는다 — 목록 응답이 수십 배로 커진다. */
export interface ArticleSummary {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  imageUrl?: string | null;
  source: string;
  author?: string | null;
  symbols?: string[];
  sentiment?: string | null;
  viewCount?: number;
  publishedAt: Date;
}

/** 상세 조회 결과. Prisma 행 전체를 그대로 내보내던 원문 응답을 유지한다. */
export interface ArticleDetail extends ArticleSummary {
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  articles: T[];
  pagination: Pagination;
}

/** 소스별 기사 수. `groupBy` 결과 모양을 그대로 유지한다. */
export interface SourceCount {
  source: string;
  _count: { source: number };
}
