import prisma from "../../shared/infrastructure/prisma";
import type {
  MarketAssetType,
  WatchlistItem,
  WatchlistRepository,
} from "../domain";

export class PrismaWatchlistRepository implements WatchlistRepository {
  async exists(userId: string, assetType: MarketAssetType, symbol: string) {
    const found = await prisma.investmentWatchlist.findUnique({
      where: { userId_assetType_symbol: { userId, assetType, symbol } },
      select: { id: true },
    });
    return found !== null;
  }

  async add(input: {
    userId: string;
    assetType: MarketAssetType;
    symbol: string;
    name: string;
    currentPrice: number | null;
    priceChange24h: number | null;
  }): Promise<WatchlistItem> {
    return prisma.investmentWatchlist.create({
      data: {
        userId: input.userId,
        assetType: input.assetType,
        symbol: input.symbol,
        name: input.name,
        currentPrice: input.currentPrice,
        priceChange24h: input.priceChange24h,
        lastUpdated: new Date(),
      },
    });
  }

  async findPage(
    userId: string,
    assetType: MarketAssetType | undefined,
    page: number,
    limit: number
  ) {
    const where = { userId, ...(assetType ? { assetType } : {}) };

    const [items, total] = await Promise.all([
      prisma.investmentWatchlist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { addedAt: "desc" },
      }),
      prisma.investmentWatchlist.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * `userId` 를 조건에 넣어 **소유 검사와 삭제를 한 번에** 한다.
   *
   * 원문은 조회 → 소유 검사 → 삭제 세 단계였고, 그 사이에 행이 사라지면 `delete` 가
   * 던졌다. 없는 항목과 남의 항목이 같은 결과(`false`)인 것은 원문과 같다 —
   * 존재 여부를 알려주지 않는 것이 의도다.
   */
  async removeOwned(userId: string, watchlistId: string) {
    const { count } = await prisma.investmentWatchlist.deleteMany({
      where: { id: watchlistId, userId },
    });
    return count > 0;
  }

  async distinctSymbols(assetType: MarketAssetType) {
    const rows = await prisma.investmentWatchlist.findMany({
      where: { assetType },
      select: { symbol: true },
      distinct: ["symbol"],
    });
    return rows.map((row) => row.symbol);
  }

  async applyPrices(
    prices: Array<{
      symbol: string;
      currentPrice: number;
      priceChange24h: number;
    }>
  ) {
    await Promise.all(
      prices.map((price) =>
        prisma.investmentWatchlist.updateMany({
          where: { symbol: price.symbol.toUpperCase(), assetType: "crypto" },
          data: {
            currentPrice: price.currentPrice,
            priceChange24h: price.priceChange24h,
            lastUpdated: new Date(),
          },
        })
      )
    );

    return prices.length;
  }
}
