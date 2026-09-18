import { logger } from "../../shared/config/logger";
import {
  logoUrlOf,
  WatchlistDuplicateError,
  WatchlistItemNotFoundError,
  type ExchangeQuotePort,
  type MarketAssetType,
  type WatchlistRepository,
} from "../domain";

export interface AddToWatchlistCommand {
  userId: string;
  assetType: MarketAssetType;
  symbol: string;
  name: string;
}

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
    private readonly exchange: ExchangeQuotePort
  ) {}

  async execute(command: AddToWatchlistCommand) {
    const symbol = command.symbol.toUpperCase();

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
}

export class ListWatchlist {
  constructor(private readonly watchlist: WatchlistRepository) {}

  async execute(
    userId: string,
    query: { assetType?: MarketAssetType; page?: number; limit?: number } = {}
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { items, total } = await this.watchlist.findPage(
      userId,
      query.assetType,
      page,
      limit
    );

    return {
      items: items.map((item) => ({ ...item, logoUrl: logoUrlOf(item.symbol) })),
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
