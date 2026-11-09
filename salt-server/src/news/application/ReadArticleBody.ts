import {
  type ArticleBodyQuery,
  type ArticleBodyStore,
  type ArticleBodyView,
  type ArticlePagePort,
  type ArticleRepository,
  type ArticleSearchPort,
  type StoredArticleBody,
  ArticleBodyUnavailableError,
  BODY_EXTRACTOR_VERSION,
  ArticleNotFoundError,
  cleanParagraphs,
  isBodyFresh,
  pickSameArticle,
  searchTitleOf,
  toArticleBodyView,
} from "../domain";

/**
 * 기사 본문 읽기(`SRV-REQ-054` FR-1~4) — 캐시 → (없거나 다시 볼 때) 포털 검색 → 같은 기사 판정 → 페이지에서 문단 → 캐시 저장.
 * 판정 · 정리 규칙은 도메인(`ArticleBody.ts`). 같은 키를 동시에 부르면 한 번만 찾는다(모달을 빠르게 두 번 열어도 검색 1회).
 * 검색 키가 없으면 `ArticleBodyUnavailableError`(503 — 화면은 요약 · 원문 링크로). 트랜잭션 없음(외부 I/O 뒤 한 행 쓰기)
 */
export class ReadArticleBody {
  private readonly inflight = new Map<string, Promise<ArticleBodyView>>();

  constructor(
    private readonly deps: { search: ArticleSearchPort; pages: ArticlePagePort; bodies: ArticleBodyStore },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(query: ArticleBodyQuery): Promise<ArticleBodyView> {
    const cached = await this.deps.bodies.find(query.key);
    if (cached && isBodyFresh(cached, this.now())) return toArticleBodyView(cached);
    if (!this.deps.search.enabled) {
      if (cached) return toArticleBodyView(cached);
      throw new ArticleBodyUnavailableError();
    }
    const running = this.inflight.get(query.key);
    if (running) return running;
    const call = this.find(query).finally(() => this.inflight.delete(query.key));
    this.inflight.set(query.key, call);
    return call;
  }

  private async find(query: ArticleBodyQuery): Promise<ArticleBodyView> {
    const row = await this.fetch(query);
    await this.deps.bodies.save(row);
    return toArticleBodyView(row);
  }

  private async fetch(query: ArticleBodyQuery): Promise<StoredArticleBody> {
    const base = { key: query.key, fetchedAt: this.now(), version: BODY_EXTRACTOR_VERSION };
    const empty = { paragraphs: [], url: null, originalUrl: null };
    try {
      const candidates = await this.deps.search.search(searchTitleOf(query.title));
      const same = pickSameArticle(query, candidates);
      if (!same) return { ...base, ...empty, status: "not_found" };
      const url = same.portalUrl ?? same.originalUrl;
      const paragraphs = cleanParagraphs(await this.deps.pages.paragraphs(url, same.portalUrl !== null), query.title);
      if (paragraphs.length === 0) return { ...base, ...empty, status: "not_found" };
      return { ...base, status: "ok", paragraphs, url, originalUrl: same.originalUrl };
    } catch {
      return { ...base, ...empty, status: "failed" };
    }
  }
}

/** 코인 기사(우리 RSS 원장) 본문 — 원장 머리로 찾는다. 없는 id 는 404 */
export class GetArticleBody {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly read: ReadArticleBody,
  ) {}

  async execute(newsId: string): Promise<ArticleBodyView> {
    const head = await this.articles.findHead(newsId);
    if (!head) throw new ArticleNotFoundError();
    return this.read.execute({ key: `coin:${newsId}`, title: head.title, publishedAt: head.publishedAt });
  }
}
