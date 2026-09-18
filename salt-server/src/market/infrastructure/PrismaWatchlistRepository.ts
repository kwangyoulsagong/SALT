import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  MarketAssetType,
  WatchlistItem,
  WatchlistRepository,
} from "../domain";

/** 관심 목록 행에서 도메인 타입으로. `Decimal` 은 여기서 끝난다. */
const toItem = (row: {
  id: string;
  userId: string;
  assetType: MarketAssetType;
  symbol: string;
  name: string;
  currentPrice: Prisma.Decimal | null;
  priceChange24h: Prisma.Decimal | null;
  lastUpdated: Date | null;
  addedAt: Date;
}): WatchlistItem => ({
  id: row.id,
  userId: row.userId,
  assetType: row.assetType,
  symbol: row.symbol,
  name: row.name,
  // `null` 을 유지한다. `Number(null)` 은 0 이라 삼항을 생략하면 가격 없음이 0원이 된다.
  currentPrice: row.currentPrice === null ? null : Number(row.currentPrice),
  priceChange24h:
    row.priceChange24h === null ? null : Number(row.priceChange24h),
  lastUpdated: row.lastUpdated,
  addedAt: row.addedAt,
});

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
    const row = await prisma.investmentWatchlist.create({
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
    return toItem(row);
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

    return { items: items.map(toItem), total };
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
