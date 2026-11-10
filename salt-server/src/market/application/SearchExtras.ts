import {
  byChangeRateDesc,
  currentSectors,
  isKrStockViewer,
  KR_INDEX_NAMES,
  krStockLogoUrl,
  latestAsOf,
  matchesName,
  matchKrIndexCodes,
  rankCoTagged,
  RELATED_CO_TAG_WINDOW_DAYS,
  RELATED_MEMBER_LIMIT,
  RELATED_PEER_LIMIT,
  SEARCH_NEWS_LIMIT,
  SEARCH_NEWS_WINDOW_DAYS,
  SEARCH_SECTOR_LIMIT,
  type KrMoveSourceStore,
  type KrStockStore,
  type KrSupplementStore,
  type MarketAssetRepository,
  type MarketAssetView,
  type SectorView,
  type StoredKrNewsTitle,
  type StoredKrStockQuote,
  type SymbolNewsPort,
  type TaggedNewsItem,
} from "../domain";

const DAY_MS = 86_400_000;
/** 국내 유니버스 전부(시세 행 — 2026-11-10 56종목, 설정 `KIS_UNIVERSE_TOP_N` + 보유 · 관심). 업종 구성 종목을 고를 때 한 번 읽는다 */
const KR_UNIVERSE_READ_LIMIT = 500;
/** 함께 태그 세기에 읽는 기사 수 상한 */
const CO_TAG_ARTICLE_LIMIT = 300;

/** 국내 원천 — 키가 없으면 `null`(국내 칸 전부 빈다) */
export interface SearchKrSource {
  store: KrStockStore;
  moveSources: KrMoveSourceStore;
  supplement: KrSupplementStore;
  viewerEmails: readonly string[];
  logoDevToken?: string;
}

export interface SearchSectorItem {
  code: string;
  name: string;
  changeRate: number;
  asOf: Date;
}

export interface SearchIndexItem {
  code: string;
  name: string;
  value: number;
  changeRate: number;
  asOf: Date;
}

export interface SearchRelatedAsset {
  assetType: "crypto" | "kr_stock";
  symbol: string;
  name: string;
  /** 모르면 `null`(국내 시세 유니버스 밖 · 코인 시세 없음) */
  changeRate: number | null;
}

export interface SearchNewsItem {
  /** 국내 = 원천 일련번호 · 코인 = 기사 id */
  id: string;
  market: "kr" | "crypto";
  /** 국내만 — 시황 · 공시 */
  kind: "news" | "disclosure" | null;
  title: string;
  source: string;
  publishedAt: Date;
  /** 코인만 — 원문 · 요약 · 이미지 */
  url: string | null;
  summary: string | null;
  imageUrl: string | null;
  related: SearchRelatedAsset[];
}

export interface SearchGroups {
  sectors: SearchSectorItem[];
  indices: SearchIndexItem[];
  news: SearchNewsItem[];
}

export interface RelatedRow {
  assetType: "crypto" | "kr_stock";
  symbol: string;
  name: string;
  logoUrl: string | null;
  currentPrice: number | null;
  changeRate: number | null;
}

export interface SearchRelated {
  /** `sector` = 같은 업종(국내 종목 · 업종을 골랐을 때) · `co_tagged` = 같은 기사에 함께 태그된 코인 · `none` = 원천 없음 */
  basis: "sector" | "co_tagged" | "none";
  sector: { code: string; name: string; changeRate: number } | null;
  items: RelatedRow[];
}

const krNewsItem = (title: StoredKrNewsTitle): SearchNewsItem => ({
  id: title.serial,
  market: "kr",
  kind: title.kind,
  title: title.title,
  source: title.providerName,
  publishedAt: title.publishedAt,
  url: null,
  summary: null,
  imageUrl: null,
  related: title.related.map((r) => ({ assetType: "kr_stock", symbol: r.code, name: r.name, changeRate: r.changeRate })),
});

const coinNewsItem = (article: TaggedNewsItem, views: Map<string, MarketAssetView>): SearchNewsItem => ({
  id: article.id,
  market: "crypto",
  kind: null,
  title: article.title,
  source: article.source,
  publishedAt: article.publishedAt,
  url: article.url,
  summary: article.summary,
  imageUrl: article.imageUrl,
  // 시세 표에 있는 코인 태그만 — 모르는 태그(거래소에 없는 코인)는 갈 곳이 없다
  related: article.symbols.flatMap((tag): SearchRelatedAsset[] => {
    const view = views.get(tag.toUpperCase());
    return view
      ? [{ assetType: "crypto", symbol: view.symbol, name: view.koreanName ?? view.symbol, changeRate: view.priceUpdatedAt ? view.change24h : null }]
      : [];
  }),
});

const krRow = (quote: StoredKrStockQuote, logoDevToken?: string): RelatedRow => ({
  assetType: "kr_stock",
  symbol: quote.code,
  name: quote.name,
  logoUrl: krStockLogoUrl(quote, logoDevToken),
  currentPrice: Math.round(quote.price),
  changeRate: quote.changeRate,
});

const sectorOf = (view: SectorView | undefined) =>
  view ? { code: view.code, name: view.name, changeRate: view.changeRate } : null;

/**
 * 검색 모달 결과 묶음 — 업종 · 지수 · 뉴스(`SRV-REQ-055` FR-1 · `FE-REQ-066` FR-8). 종목 묶음은 기존 `SearchAssets`.
 * 국내(업종 · 지수 · 시황 제목)는 소유자만 — 국내 시세가 소유자 전용이다(F011). 코인 기사는 로그인 사용자 모두.
 * 요청당 읽기: 업종 표 1 · 지수 1 · 국내 제목 1 · 코인 제목 1 · 코인 태그 이름 1. **검색어를 로그에 남기지 않는다**
 */
export class SearchResultGroups {
  constructor(
    private readonly news: SymbolNewsPort,
    private readonly assets: MarketAssetRepository,
    private readonly kr: SearchKrSource | null,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(query: { email?: string; q: string }): Promise<SearchGroups> {
    const q = query.q.trim();
    if (q === "") return { sectors: [], indices: [], news: [] };
    const kr = this.kr && isKrStockViewer(query.email, this.kr.viewerEmails) ? this.kr : null;
    const since = new Date(this.now().getTime() - SEARCH_NEWS_WINDOW_DAYS * DAY_MS);
    const indexCodes = kr ? matchKrIndexCodes(q) : [];

    const [board, indexQuotes, krTitles, coinArticles] = await Promise.all([
      kr ? kr.moveSources.sectorBoard() : Promise.resolve([]),
      indexCodes.length && kr ? kr.supplement.indexQuotes(indexCodes) : Promise.resolve([]),
      kr ? kr.moveSources.searchNewsTitles(q, since, SEARCH_NEWS_LIMIT) : Promise.resolve([] as StoredKrNewsTitle[]),
      this.news.searchTitles(q, since, SEARCH_NEWS_LIMIT),
    ]);
    const tags = [...new Set(coinArticles.flatMap((a) => a.symbols.map((s) => s.toUpperCase())))];
    const views = new Map(
      (tags.length ? await this.assets.findViews(tags) : []).map((view) => [view.symbol.toUpperCase(), view])
    );

    const quoteByCode = new Map(indexQuotes.map((quote) => [quote.code, quote]));
    return {
      sectors: currentSectors(board)
        .filter((sector) => matchesName(q, sector.name))
        .slice(0, SEARCH_SECTOR_LIMIT)
        .map((s) => ({ code: s.code, name: s.name, changeRate: s.changeRate, asOf: s.asOf })),
      indices: indexCodes.flatMap((code): SearchIndexItem[] => {
        const quote = quoteByCode.get(code);
        return quote
          ? [{ code, name: KR_INDEX_NAMES[code]!, value: quote.value, changeRate: quote.changeRate, asOf: quote.updatedAt }]
          : [];
      }),
      news: [...krTitles.map(krNewsItem), ...coinArticles.map((a) => coinNewsItem(a, views))]
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || a.id.localeCompare(b.id))
        .slice(0, SEARCH_NEWS_LIMIT),
    };
  }
}

/** 첫 화면 "지금 뜨는 업종"(`SRV-REQ-055` FR-2) — 국내 소유자만. 비소유자 · 키 없음은 빈 목록(404 가 아니다 — 첫 화면이 열 때마다 부른다) */
export class ReadRisingSectors {
  constructor(private readonly kr: SearchKrSource | null) {}

  async execute(query: { email?: string; limit: number }): Promise<{ asOf: Date | null; items: SearchSectorItem[] }> {
    if (!this.kr || !isKrStockViewer(query.email, this.kr.viewerEmails)) return { asOf: null, items: [] };
    const items = currentSectors(await this.kr.moveSources.sectorBoard()).slice(0, query.limit);
    return { asOf: latestAsOf(items), items };
  }
}

/**
 * 곁 칸(`SRV-REQ-055` FR-3) — 고른 줄의 관련 종목.
 * - 국내 종목: 같은 업종(지수업종 중분류 먼저)의 유니버스 종목 · 등락률 높은 순 3(자기 제외)
 * - 업종: 그 업종 유니버스 종목 5
 * - 코인: 같은 기사에 함께 태그된 코인 3(30일)
 * 원천이 없으면 `basis: none`(빈 칸 — 지어내지 않는다). 국내는 소유자만(비소유자는 `none`)
 */
export class ReadSearchRelated {
  constructor(
    private readonly news: SymbolNewsPort,
    private readonly assets: MarketAssetRepository,
    private readonly kr: SearchKrSource | null,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    query: { email?: string } & ({ assetType: "crypto" | "kr_stock"; symbol: string } | { sector: string })
  ): Promise<SearchRelated> {
    const none: SearchRelated = { basis: "none", sector: null, items: [] };
    if ("assetType" in query && query.assetType === "crypto") return this.coTagged(query.symbol);
    const kr = this.kr && isKrStockViewer(query.email, this.kr.viewerEmails) ? this.kr : null;
    if (!kr) return none;

    const sectorCode =
      "sector" in query ? query.sector : (await kr.moveSources.sectorIndexCodes([query.symbol])).get(query.symbol);
    if (!sectorCode) return none;
    const self = "sector" in query ? null : query.symbol;
    const limit = self === null ? RELATED_MEMBER_LIMIT : RELATED_PEER_LIMIT;

    const [board, universe] = await Promise.all([
      kr.moveSources.sectorBoard(),
      kr.store.quotes({ limit: KR_UNIVERSE_READ_LIMIT, offset: 0 }),
    ]);
    const sector = sectorOf(currentSectors(board).find((s) => s.code === sectorCode));
    // 업종 검색으로 온 코드가 지금 순위에 없으면(이름 없음 · 지난 값) 없는 업종으로 본다
    if (self === null && !sector) return none;
    const sectors = await kr.moveSources.sectorIndexCodes(universe.map((quote) => quote.code));
    const items = universe
      .filter((quote) => quote.code !== self && sectors.get(quote.code) === sectorCode)
      .map((quote) => krRow(quote, kr.logoDevToken))
      .sort(byChangeRateDesc)
      .slice(0, limit);
    return { basis: "sector", sector, items };
  }

  private async coTagged(symbol: string): Promise<SearchRelated> {
    const since = new Date(this.now().getTime() - RELATED_CO_TAG_WINDOW_DAYS * DAY_MS);
    const lists = await this.news.tagLists(symbol.toUpperCase(), since, CO_TAG_ARTICLE_LIMIT);
    // 시세 표에 없는 태그를 빼고 셀 수 있게 넉넉히 고른 뒤 자른다
    const ranked = rankCoTagged(symbol, lists, RELATED_PEER_LIMIT * 4);
    const views = ranked.length ? await this.assets.findViews(ranked) : [];
    const bySymbol = new Map(views.map((view) => [view.symbol.toUpperCase(), view]));
    const items = ranked
      .flatMap((tag): RelatedRow[] => {
        const view = bySymbol.get(tag);
        return view
          ? [
              {
                assetType: "crypto",
                symbol: view.symbol,
                name: view.koreanName ?? view.englishName ?? view.symbol,
                logoUrl: view.logoUrl || null,
                currentPrice: view.priceUpdatedAt ? view.currentPrice : null,
                changeRate: view.priceUpdatedAt ? view.change24h : null,
              },
            ]
          : [];
      })
      .slice(0, RELATED_PEER_LIMIT);
    return items.length ? { basis: "co_tagged", sector: null, items } : { basis: "none", sector: null, items: [] };
  }
}
