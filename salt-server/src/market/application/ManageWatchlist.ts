import { logger } from "../../shared/config/logger";
import {
  isKrStockCode,
  isKrStockViewer,
  KrStockDisabledError,
  KrStockNotAvailableError,
  krStockLogoUrl,
  logoUrlOf,
  WatchlistDuplicateError,
  WatchlistItemNotFoundError,
  type AssetQuote,
  type ExchangeQuotePort,
  type KrStockStore,
  type MarketAssetRepository,
  type MarketAssetType,
  type WatchlistItem,
  type WatchlistItemView,
  type WatchlistRepository,
} from "../domain";

export interface AddToWatchlistCommand {
  userId: string;
  /** 국내 주식은 소유자만 담을 수 있다(시세가 소유자 전용 — F011 §정책) */
  email?: string;
  assetType: MarketAssetType;
  symbol: string;
  name: string;
}

/**
 * 국내 주식 관심 종목(F011 슬라이스 3). 시세 · 마스터가 `market` 의 KIS 저장소에 있다. **키가 없으면 `null`** —
 * 그때 국내 주식 관심 종목은 담을 수 없고(503) 목록에서도 빠진다
 */
export interface WatchlistKrSource {
  store: KrStockStore;
  viewerEmails: readonly string[];
  /** logo.dev 퍼블리셔블 키 — 시세표와 같은 로고(`krStockLogoUrl`) */
  logoDevToken?: string;
}

const canViewKr = (kr: WatchlistKrSource | null, email: string | undefined): kr is WatchlistKrSource =>
  kr !== null && isKrStockViewer(email, kr.viewerEmails);

/**
 * 관심 목록 추가.
 *
 * **가격 조회 실패가 추가를 막지 않는다** — 관심 목록의 목적은 추적이고 시세는 나중에
 * 워커가 채운다. 원문의 빈 catch 를 유지하되 **로그를 남긴다**: 조용히 삼키면 거래소
 * 장애가 "가격이 안 보인다"로만 드러난다.
 */
export class AddToWatchlist {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly exchange: ExchangeQuotePort,
    private readonly kr: WatchlistKrSource | null = null
  ) {}

  async execute(command: AddToWatchlistCommand) {
    const symbol = command.symbol.toUpperCase();
    if (command.assetType === "kr_stock") return this.addKrStock(command, symbol);

    if (
      await this.watchlist.exists(command.userId, command.assetType, symbol)
    ) {
      throw new WatchlistDuplicateError();
    }

    let currentPrice: number | null = null;
    let priceChange24h: number | null = null;

    if (command.assetType === "crypto") {
      try {
        const quote = await this.exchange.currentPrice(command.symbol);
        currentPrice = quote.currentPrice;
        priceChange24h = quote.change24h;
      } catch (error: any) {
        logger.warn(
          `관심 목록 추가 중 시세 조회 실패 — 가격 없이 추가한다: ${symbol}`,
          error?.message
        );
      }
    }

    return this.watchlist.add({
      userId: command.userId,
      assetType: command.assetType,
      symbol,
      name: command.name,
      currentPrice,
      priceChange24h,
    });
  }

  /**
   * 국내 주식 — 이름은 **마스터 것**을 쓴다(클라이언트가 보낸 이름을 믿지 않는다). 마스터에 없는 코드 · 비소유자는 같은
   * 404 다(국내 주식이 있다는 사실을 비소유자에게 주지 않는다). 담으면 다음 시세 회차부터 유니버스(관심 ∪ 시총 상위)에 든다
   */
  private async addKrStock(command: AddToWatchlistCommand, code: string) {
    if (!this.kr) throw new KrStockDisabledError();
    if (!canViewKr(this.kr, command.email) || !isKrStockCode(code)) throw new KrStockNotAvailableError();
    const listing = await this.kr.store.findListing(code);
    if (!listing) throw new KrStockNotAvailableError();
    if (await this.watchlist.exists(command.userId, "kr_stock", code)) throw new WatchlistDuplicateError();
    const quote = await this.kr.store.quote(code);
    return this.watchlist.add({
      userId: command.userId,
      assetType: "kr_stock",
      symbol: code,
      name: listing.name,
      currentPrice: quote?.price ?? null,
      priceChange24h: quote?.changeRate ?? null,
    });
  }
}

/** 시각이 없는 값은 가장 오래된 것으로 본다 — 있는 쪽이 이긴다. */
const ageOf = (at: Date | null) => at?.getTime() ?? 0;

/**
 * 관심 목록 한 줄의 시세를 고른다 (`SRV-REQ-008` FR-33).
 *
 * 출처가 둘이다 — 행에 적힌 값(BFF 가 실시간 캐시를 밀어 넣는다, 크립토만)과 자산 표의
 * 저장 시세(`market` 워커). **더 최근 것을 쓴다.** 어느 한쪽을 늘 신뢰하면 주식은
 * 영원히 `null` 이거나(행만 보면) 크립토가 워커 주기만큼 늦는다(자산 표만 보면).
 *
 * 가격이 없으면 `null` 을 그대로 둔다. 신선도 판정은 부르는 쪽이 한다.
 */
const pickQuote = (
  item: WatchlistItem,
  quote: AssetQuote | undefined
): Pick<
  WatchlistItemView,
  "currentPrice" | "priceChange24h" | "priceUpdatedAt"
> => {
  const fromRow =
    item.currentPrice === null
      ? null
      : {
          currentPrice: item.currentPrice,
          priceChange24h: item.priceChange24h,
          priceUpdatedAt: item.lastUpdated,
        };

  const fromAssets =
    !quote || quote.currentPrice === null
      ? null
      : {
          currentPrice: quote.currentPrice,
          priceChange24h: quote.change24h,
          priceUpdatedAt: quote.priceUpdatedAt,
        };

  if (!fromRow) {
    return (
      fromAssets ?? {
        currentPrice: null,
        priceChange24h: null,
        priceUpdatedAt: null,
      }
    );
  }
  if (!fromAssets) return fromRow;

  return ageOf(fromAssets.priceUpdatedAt) > ageOf(fromRow.priceUpdatedAt)
    ? fromAssets
    : fromRow;
};

export class ListWatchlist {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly assets: MarketAssetRepository,
    private readonly kr: WatchlistKrSource | null = null
  ) {}

  async execute(
    userId: string,
    query: { assetType?: MarketAssetType; page?: number; limit?: number } = {},
    viewer: { email?: string } = {}
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    // 국내 주식 시세를 볼 수 없는 사람(비소유자 · 키 없음)에게는 국내 주식 행 자체를 주지 않는다
    const krVisible = canViewKr(this.kr, viewer.email);
    if (query.assetType === "kr_stock" && !krVisible) {
      return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const { items, total } = await this.watchlist.findPage(
      userId,
      query.assetType,
      page,
      limit,
      krVisible ? [] : ["kr_stock"]
    );

    // 심볼 목록이 비면 조회를 부르지 않는다. `findQuotes([])` 도 빈 배열이지만
    // 왕복을 한 번 아끼는 것이 아니라 **빈 `IN ()` 을 만들지 않는 것**이 목적이다.
    const coinSymbols = items.filter((item) => item.assetType !== "kr_stock").map((item) => item.symbol);
    const krCodes = items.filter((item) => item.assetType === "kr_stock").map((item) => item.symbol);
    const [quotes, krQuotes] = await Promise.all([
      coinSymbols.length ? this.assets.findQuotes(coinSymbols) : Promise.resolve([]),
      krCodes.length && this.kr
        ? this.kr.store.quotes({ codes: krCodes, limit: krCodes.length, offset: 0 })
        : Promise.resolve([]),
    ]);
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
    // 국내 주식은 `kr_stock_quotes` 가 유일한 출처다(행 값은 추가 시점 사진) — 코인처럼 두 출처를 견주지 않는다
    const byKrCode = new Map(krQuotes.map((quote) => [quote.code, quote]));

    return {
      items: items.map((item): WatchlistItemView => {
        const krQuote = item.assetType === "kr_stock" ? byKrCode.get(item.symbol) : undefined;
        const { currentPrice, priceChange24h, priceUpdatedAt } =
          item.assetType === "kr_stock"
            ? krQuote
              ? { currentPrice: Math.round(krQuote.price), priceChange24h: krQuote.changeRate, priceUpdatedAt: krQuote.priceUpdatedAt }
              : { currentPrice: null, priceChange24h: null, priceUpdatedAt: null }
            : pickQuote(item, bySymbol.get(item.symbol));
        return {
          id: item.id,
          assetType: item.assetType,
          symbol: item.symbol,
          name: item.name,
          currentPrice,
          priceChange24h,
          priceUpdatedAt,
          // `logoUrlOf` 는 업비트 CDN 규칙이다. 주식에 붙이면 404 URL 을 만든다. 국내 주식은 시세표와 같은 규칙(`krStockLogoUrl`)
          logoUrl:
            item.assetType === "crypto"
              ? logoUrlOf(item.symbol)
              : krQuote
                ? krStockLogoUrl(krQuote, this.kr?.logoDevToken)
                : null,
          addedAt: item.addedAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

/**
 * 관심 목록 제거.
 *
 * 원문은 항목을 찾고, 소유자를 검사하고, 지웠다 — **왕복 두 번에 검사와 실행 사이가
 * 벌어진다.** `userId` 를 조건에 넣어 한 번에 지우고 지워진 행 수로 판정한다.
 * 남의 항목과 없는 항목이 같은 404 라는 것도 원문 그대로다(존재를 알려주지 않는다).
 */
export class RemoveFromWatchlist {
  constructor(private readonly watchlist: WatchlistRepository) {}

  async execute(userId: string, watchlistId: string) {
    const removed = await this.watchlist.removeOwned(userId, watchlistId);
    if (!removed) throw new WatchlistItemNotFoundError();
    return { message: "Removed from watchlist successfully" };
  }
}

/** BFF 가 구독할 심볼을 묻는다. */
export class ListWatchlistSymbols {
  constructor(private readonly watchlist: WatchlistRepository) {}

  execute() {
    return this.watchlist.distinctSymbols("crypto");
  }
}

/** BFF 가 받은 실시간 시세를 관심 목록에 반영한다. */
export class UpdateWatchlistPrices {
  constructor(private readonly watchlist: WatchlistRepository) {}

  async execute(
    prices: Array<{
      symbol: string;
      currentPrice: number;
      priceChange24h: number;
    }>
  ) {
    const updated = await this.watchlist.applyPrices(prices);
    return { updated };
  }
}
