import {
  isKrStockViewer,
  krStockLogoUrl,
  MarketOverviewSort,
  trackedAssetKey,
  type MarketAssetRepository,
  type MarketAssetType,
  type MarketAssetView,
  type WatchlistRepository,
} from "../domain";
import {
  readTrackedSummary,
  type TrackedSummary,
  type WatchlistKrSource,
  type WatchlistTracking,
} from "./ManageWatchlist";

/** 한 번에 돌려주는 최대 행 — 검색은 "고르는" 화면이지 시장 목록이 아니다(`FEATURE-000` FR-40) */
export const ASSET_SEARCH_MAX_LIMIT = 30;

export interface SearchAssetsQuery {
  userId: string;
  /** 국내 주식은 소유자만 본다(F011 — 시세가 소유자 전용) */
  email?: string;
  /** 앞뒤 공백은 여기서 지운다. 비면 추적 목록(관심 ∪ 보유)을 준다(FR-86) */
  q: string;
  assetType?: Extract<MarketAssetType, "crypto" | "kr_stock">;
  limit: number;
}

export interface AssetSearchItem {
  assetType: MarketAssetType;
  symbol: string;
  name: string;
  /** 크립토는 업비트 CDN, 국내 주식은 시세표와 같은 규칙. 모르면 `null` — 플레이스홀더를 만들지 않는다 */
  logoUrl: string | null;
  /** 저장 시세. 없으면 `null` — 0 을 만들지 않는다(국내 주식은 시세 유니버스 밖이면 없다) */
  currentPrice: number | null;
  /** 24시간(코인) · 전일 대비(국내) 변동률 % */
  changeRate: number | null;
  isTracked: boolean;
  isHeld: boolean;
}

export interface AssetSearchResult {
  items: AssetSearchItem[];
  tracked: TrackedSummary;
}

/**
 * 맞음 정도 — 0 이 먼저다. 심볼 · 코드 · 이름이 검색어와 **같으면** 0, 그것으로 **시작하면** 1, 나머지는 2.
 * 같은 순위 안에서는 각 원천이 준 순서(코인 거래대금 · 국내 시총)를 지킨다 — 정렬이 안정적이라 그렇다
 */
const matchRank = (q: string, symbol: string, name: string): number => {
  const upper = q.toUpperCase();
  const lower = q.toLowerCase();
  const nameLower = name.toLowerCase();
  if (symbol.toUpperCase() === upper || nameLower === lower) return 0;
  if (symbol.toUpperCase().startsWith(upper) || nameLower.startsWith(lower)) return 1;
  return 2;
};

/** 저장 시세가 한 번도 안 들어온 코인 행은 `MarketAssetView` 가 0 을 준다(원문 동작) — 검색은 그것을 `null` 로 되돌린다 */
const cryptoQuote = (view: MarketAssetView | undefined) =>
  view && view.priceUpdatedAt !== null
    ? { currentPrice: view.currentPrice, changeRate: view.change24h }
    : { currentPrice: null, changeRate: null };

/**
 * 종목 검색 — 코인 + 국내 주식 한 검색(`SRV-REQ-008` FR-80 · 86 · 87, `FEATURE-000` FR-40).
 *
 * 요청당 읽기: 관심 목록 1 · 보유 1(`HoldingProbe`) · 코인 자산 1 · (국내 소유자면) 마스터 1 · 이름 · 로고 1 · 시세 1.
 * 결과 행마다 조회하지 않는다(FR-84). **검색어를 로그에 남기지 않는다** — 관심 종목은 투자 의도다(FR-86)
 */
export class SearchAssets {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly assets: MarketAssetRepository,
    private readonly tracking: WatchlistTracking,
    private readonly kr: WatchlistKrSource | null = null
  ) {}

  async execute(query: SearchAssetsQuery): Promise<AssetSearchResult> {
    const q = query.q.trim();
    const krVisible = this.kr !== null && isKrStockViewer(query.email, this.kr.viewerEmails);
    const { watched, held, summary } = await readTrackedSummary(this.watchlist, this.tracking, query.userId);
    const trackedKeys = new Set(watched.map(trackedAssetKey));
    const heldKeys = new Set(held.map(trackedAssetKey));
    const flags = (assetType: MarketAssetType, symbol: string) => {
      const key = trackedAssetKey({ assetType, symbol });
      return { isTracked: trackedKeys.has(key) || heldKeys.has(key), isHeld: heldKeys.has(key) };
    };

    const wants = (assetType: MarketAssetType) =>
      (query.assetType === undefined || query.assetType === assetType) && (assetType !== "kr_stock" || krVisible);

    if (q === "") {
      return { items: await this.trackedItems(watched, held, wants, flags, query.limit), tracked: summary };
    }

    const [coins, krRows] = await Promise.all([
      wants("crypto")
        ? this.assets.findAllActive({ sort: MarketOverviewSort.TradeValue, order: "desc", search: q })
        : Promise.resolve([] as MarketAssetView[]),
      wants("kr_stock") && this.kr ? this.kr.store.search(q, query.limit) : Promise.resolve([]),
    ]);

    const coinItems = coins.slice(0, query.limit).map((view): AssetSearchItem => ({
      assetType: "crypto",
      symbol: view.symbol,
      name: view.koreanName ?? view.englishName ?? view.symbol,
      logoUrl: view.logoUrl,
      ...cryptoQuote(view),
      ...flags("crypto", view.symbol),
    }));
    const krItems = await this.krItems(krRows.map((row) => row.code), flags);

    const ranked = [...coinItems, ...krItems]
      .map((item, order) => ({ item, order, rank: matchRank(q, item.symbol, item.name) }))
      .sort((a, b) => a.rank - b.rank || a.order - b.order)
      .map(({ item }) => item);
    return { items: ranked.slice(0, query.limit), tracked: summary };
  }

  /** 검색어가 없을 때 — 관심 ∪ 보유. 관심 목록 순서(최근 추가 먼저) 뒤에 관심에 없는 보유를 붙인다 */
  private async trackedItems(
    watched: Awaited<ReturnType<WatchlistRepository["listAll"]>>,
    held: Array<{ assetType: MarketAssetType; symbol: string }>,
    wants: (assetType: MarketAssetType) => boolean,
    flags: (assetType: MarketAssetType, symbol: string) => { isTracked: boolean; isHeld: boolean },
    limit: number
  ): Promise<AssetSearchItem[]> {
    const seen = new Set<string>();
    const targets: Array<{ assetType: MarketAssetType; symbol: string; name: string | null }> = [];
    for (const asset of [
      ...watched.map((row) => ({ assetType: row.assetType, symbol: row.symbol, name: row.name as string | null })),
      ...held.map((row) => ({ ...row, name: null })),
    ]) {
      const key = trackedAssetKey(asset);
      if (seen.has(key) || !wants(asset.assetType)) continue;
      seen.add(key);
      targets.push(asset);
    }
    const picked = targets.slice(0, limit);

    const coinSymbols = picked.filter((t) => t.assetType === "crypto").map((t) => t.symbol);
    const krCodes = picked.filter((t) => t.assetType === "kr_stock").map((t) => t.symbol);
    const [coinViews, krItems] = await Promise.all([
      coinSymbols.length ? this.assets.findViews(coinSymbols) : Promise.resolve([] as MarketAssetView[]),
      this.krItems(krCodes, flags),
    ]);
    const coinBySymbol = new Map(coinViews.map((view) => [view.symbol, view]));
    const krByCode = new Map(krItems.map((item) => [item.symbol, item]));

    return picked.map((target): AssetSearchItem => {
      if (target.assetType === "kr_stock") {
        return (
          krByCode.get(target.symbol) ?? {
            assetType: "kr_stock",
            symbol: target.symbol,
            name: target.name ?? target.symbol,
            logoUrl: null,
            currentPrice: null,
            changeRate: null,
            ...flags("kr_stock", target.symbol),
          }
        );
      }
      const view = target.assetType === "crypto" ? coinBySymbol.get(target.symbol) : undefined;
      return {
        assetType: target.assetType,
        symbol: target.symbol,
        name: view?.koreanName ?? target.name ?? target.symbol,
        logoUrl: view?.logoUrl ?? null,
        ...cryptoQuote(view),
        ...flags(target.assetType, target.symbol),
      };
    });
  }

  /** 국내 주식 행 — 이름 · 로고는 마스터 전체(유니버스 밖 포함), 시세는 저장값(유니버스 안만). 입력 순서를 지킨다 */
  private async krItems(
    codes: string[],
    flags: (assetType: MarketAssetType, symbol: string) => { isTracked: boolean; isHeld: boolean }
  ): Promise<AssetSearchItem[]> {
    if (!this.kr || codes.length === 0) return [];
    const [labels, quotes] = await Promise.all([
      this.kr.store.labels(codes),
      this.kr.store.quotes({ codes, limit: codes.length, offset: 0 }),
    ]);
    const labelByCode = new Map(labels.map((label) => [label.code, label]));
    const quoteByCode = new Map(quotes.map((quote) => [quote.code, quote]));
    return codes.flatMap((code): AssetSearchItem[] => {
      const label = labelByCode.get(code);
      if (!label) return [];
      const quote = quoteByCode.get(code);
      return [
        {
          assetType: "kr_stock",
          symbol: code,
          name: label.name,
          logoUrl: krStockLogoUrl(label, this.kr?.logoDevToken),
          currentPrice: quote ? Math.round(quote.price) : null,
          changeRate: quote ? quote.changeRate : null,
          ...flags("kr_stock", code),
        },
      ];
    });
  }
}
