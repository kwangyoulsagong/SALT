/**
 * 뉴스 프리뷰 뷰모델 매핑 — **순수 함수**.
 *
 * 여기에는 import 가 없다. 판정(무엇을 내보내고 무엇을 버리나)을 네트워크 없이
 * 검증하기 위한 조건이다 (`watchlist.viewmodel.ts` 와 같은 이유).
 */

/**
 * 프리뷰 카드 한 장 (`BFF-REQ-007` FR-31~34).
 *
 * **`content`(전문)를 담지 않는다.** 카드가 쓰지 않는데 목록에 실으면 응답이
 * 기사 수만큼 커진다 (`performance-bff.md` §5).
 */
export interface NewsPreviewVM {
  id: string;
  title: string;
  summary: string | null;
  /** 없으면 `null`. **플레이스홀더 URL 을 만들지 않는다** — 화면이 판단한다 (FR-33) */
  imageUrl: string | null;
  source: string;
  url: string;
  publishedAt: string;
  /** 서버가 주면 전달하고 없으면 생략한다. **BFF 가 만들지 않는다** (FR-34) */
  viewCount?: number;
}

export interface ServerNewsArticle {
  id: string;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  source: string;
  url: string;
  publishedAt: string | Date;
  viewCount?: number;
  /** 서버 목록이 전문을 실어 보내면 **여기서 끊는다.** 카드로 넘어가지 않는다 */
  content?: string | null;
}

const toIso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value;

/**
 * 서버 기사 → 카드.
 *
 * 0건이면 빈 배열이다. **더미를 만들지 않는다** (FR-32) — 원문 화면은 제목에
 * 테스트 문자열(`faskdljf…`)이 박힌 상수 카드를 그리고 있었다.
 */
export const toNewsPreviewViewModels = (
  articles: readonly ServerNewsArticle[],
): NewsPreviewVM[] =>
  articles.map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary ?? null,
    imageUrl: article.imageUrl ?? null,
    source: article.source,
    url: article.url,
    publishedAt: toIso(article.publishedAt),
    ...(typeof article.viewCount === "number"
      ? { viewCount: article.viewCount }
      : {}),
  }));
