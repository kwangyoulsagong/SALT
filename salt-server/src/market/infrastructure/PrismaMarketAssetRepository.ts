import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import {
  logoUrlOf,
  MarketOverviewSort,
  type MarketAssetRepository,
  type MarketAssetType,
  type MarketAssetView,
  type MarketListing,
  type MarketOverviewQuery,
  type Quote,
} from "../domain";

/** 정렬 축 → 컬럼. 표가 하나라 축을 추가할 때 고칠 자리가 하나다. */
const SORT_COLUMN: Record<MarketOverviewSort, keyof Prisma.MarketAssetOrderByWithRelationInput> = {
  [MarketOverviewSort.TradeValue]: "tradeValue24h",
  [MarketOverviewSort.Change]: "change24h",
  [MarketOverviewSort.Price]: "currentPrice",
  [MarketOverviewSort.Name]: "koreanName",
};

/** `Decimal | null` 을 화면용 숫자로. **0 으로 떨어뜨리는 것이 원문 동작**이다. */
const num = (value: Prisma.Decimal | null): number => (value ? Number(value) : 0);

export class PrismaMarketAssetRepository implements MarketAssetRepository {
  async findPage(query: MarketOverviewQuery) {
    const where: Prisma.MarketAssetWhereInput = { isActive: true };

    if (query.search) {
      where.OR = [
        { symbol: { contains: query.search, mode: "insensitive" } },
        { koreanName: { contains: query.search, mode: "insensitive" } },
        { englishName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.marketAsset.findMany({
        where,
        orderBy: { [SORT_COLUMN[query.sort]]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.marketAsset.count({ where }),
    ]);

    const items: MarketAssetView[] = rows.map((row) => ({
      symbol: row.symbol,
      market: row.market,
      koreanName: row.koreanName,
      englishName: row.englishName,
      currentPrice: num(row.currentPrice),
      change24h: num(row.change24h),
      high24h: num(row.high24h),
      low24h: num(row.low24h),
      volume24h: num(row.volume24h),
      tradeValue24h: num(row.tradeValue24h),
      logoUrl: row.logoUrl || logoUrlOf(row.symbol),
      priceUpdatedAt: row.priceUpdatedAt,
    }));

    return { items, total };
  }

  async activeSymbols(assetType?: MarketAssetType): Promise<string[]> {
    const rows = await prisma.marketAsset.findMany({
      where: { isActive: true, ...(assetType ? { assetType } : {}) },
      select: { symbol: true },
    });

    return rows
      .map((row) => row.symbol)
      .filter((symbol) => typeof symbol === "string" && symbol.trim() !== "");
  }

  async symbolsWithStalePrice(symbols: string[], staleBefore: Date) {
    const rows = await prisma.marketAsset.findMany({
      where: {
        symbol: { in: symbols },
        OR: [{ priceUpdatedAt: null }, { priceUpdatedAt: { lt: staleBefore } }],
      },
      select: { symbol: true },
    });
    return rows.map((row) => row.symbol);
  }

  /**
   * 상장 목록 반영.
   *
   * `upsert` 는 단건이라 마켓 수만큼 왕복한다(원문도 같다). `createMany` 로 바꾸면
   * **이미 있는 행의 한글명 갱신이 사라진다** — 6시간에 한 번 도는 작업이라 왕복 수보다
   * 갱신이 맞다.
   */
  async upsertListings(listings: MarketListing[]) {
    for (const listing of listings) {
      await prisma.marketAsset.upsert({
        where: { symbol: listing.symbol },
        update: {
          koreanName: listing.koreanName,
          englishName: listing.englishName,
          isActive: true,
        },
        create: {
          symbol: listing.symbol,
          market: listing.market,
          koreanName: listing.koreanName,
          englishName: listing.englishName,
          listedAt: new Date(),
        },
      });
    }
  }

  async markDelistedExcept(symbols: string[]) {
    await prisma.marketAsset.updateMany({
      where: { symbol: { notIn: symbols } },
      data: { isActive: false, delistedAt: new Date() },
    });
  }

  /**
   * 시세 반영.
   *
   * `update` 는 행이 없으면 던진다. 거래소가 우리 DB 에 없는 심볼을 주는 경우
   * (동기화 전 신규 상장) 배치 전체가 죽지 않도록 **`updateMany` 로 바꿨다** —
   * 없으면 0행이 갱신되고 다음 `market-sync` 가 행을 만든다.
   */
  async applyQuotes(quotes: Quote[]) {
    await Promise.all(
      quotes.map((quote) =>
        prisma.marketAsset.updateMany({
          where: { symbol: quote.symbol },
          data: {
            currentPrice: quote.currentPrice,
            change24h: quote.change24h,
            high24h: quote.high24h,
            low24h: quote.low24h,
            volume24h: quote.volume24h,
            tradeValue24h: quote.tradeValue24h,
            priceUpdatedAt: new Date(),
          },
        })
      )
    );
  }
}
