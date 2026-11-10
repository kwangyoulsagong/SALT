import type { MarketAsset as MarketAssetRow, Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import {
  logoUrlOf,
  MarketOverviewSort,
  type AssetQuote,
  type MarketAssetRepository,
  type MarketAssetType,
  type MarketAssetView,
  type MarketBreadth,
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

const activeWhere = (search?: string): Prisma.MarketAssetWhereInput => ({
  isActive: true,
  ...(search
    ? {
        OR: [
          { symbol: { contains: search, mode: "insensitive" } },
          { koreanName: { contains: search, mode: "insensitive" } },
          { englishName: { contains: search, mode: "insensitive" } },
        ],
      }
    : {}),
});

const toView = (row: MarketAssetRow): MarketAssetView => ({
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
});

export class PrismaMarketAssetRepository implements MarketAssetRepository {
  /**
   * 저장된 시세 몇 줄.
   *
   * 거래소를 부르지 않는다 — 코치의 판단은 **동기화 워커가 적어 둔 값**을 보고,
   * 그 값이 얼마나 오래됐는지(`priceUpdatedAt`)를 함께 준다. 신선도 판정은
   * 부르는 쪽의 규칙이다(`coach/domain/policy/preflight.ts`).
   */
  async findQuotes(symbols: string[]): Promise<AssetQuote[]> {
    if (symbols.length === 0) return [];

    const rows = await prisma.marketAsset.findMany({
      where: { symbol: { in: symbols } },
      select: {
        symbol: true,
        assetType: true,
        koreanName: true,
        currentPrice: true,
        change24h: true,
        tradeValue24h: true,
        priceUpdatedAt: true,
      },
    });

    return rows.map((row) => ({
      symbol: row.symbol,
      assetType: row.assetType,
      koreanName: row.koreanName,
      currentPrice: row.currentPrice === null ? null : Number(row.currentPrice),
      change24h: row.change24h === null ? null : Number(row.change24h),
      tradeValue24h: row.tradeValue24h === null ? null : Number(row.tradeValue24h),
      priceUpdatedAt: row.priceUpdatedAt,
    }));
  }

  async breadth(): Promise<MarketBreadth> {
    const base = { isActive: true } as const;
    const [up, down, flat] = await Promise.all([
      prisma.marketAsset.count({ where: { ...base, change24h: { gt: 0 } } }),
      prisma.marketAsset.count({ where: { ...base, change24h: { lt: 0 } } }),
      prisma.marketAsset.count({ where: { ...base, change24h: 0 } }),
    ]);
    return { up, down, flat, total: up + down + flat };
  }

  async findViews(symbols: string[]): Promise<MarketAssetView[]> {
    if (symbols.length === 0) return [];
    const rows = await prisma.marketAsset.findMany({
      where: { symbol: { in: symbols }, isActive: true },
    });
    return rows.map(toView);
  }

  async findPage(query: MarketOverviewQuery) {
    const where = activeWhere(query.search);

    const [rows, total] = await Promise.all([
      prisma.marketAsset.findMany({
        where,
        orderBy: { [SORT_COLUMN[query.sort]]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.marketAsset.count({ where }),
    ]);

    return { items: rows.map(toView), total };
  }

  async findAllActive(
    query: Pick<MarketOverviewQuery, "sort" | "order" | "search">
  ) {
    const rows = await prisma.marketAsset.findMany({
      where: activeWhere(query.search),
      orderBy: { [SORT_COLUMN[query.sort]]: query.order },
    });
    return rows.map(toView);
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

  async topByTradeValue(assetType: MarketAssetType, n: number): Promise<string[]> {
    const rows = await prisma.marketAsset.findMany({
      where: { isActive: true, assetType, tradeValue24h: { not: null } },
      orderBy: { tradeValue24h: "desc" },
      take: n,
      select: { symbol: true },
    });
    return rows.map((row) => row.symbol);
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
   * 시세 반영 — **한 문장**(`UPDATE … FROM unnest`). 없는 심볼은 0행(동기화 전 신규 상장 — 다음 `market-sync` 가 행을 만든다).
   *
   * 전에는 시세마다 `updateMany` 를 `Promise.all` 로 흩었다 — 매분 300종목(100개씩 세 묶음)이 묶음마다 연결 풀(17)을 거의 다 잡아
   * 그동안 API 요청이 줄을 섰다(장중 `/api/ai-coach` 0.2~0.9s · BFF 예산 300ms 넘어 504, 2026-11-10 실측 — 느린 요청의 읽기 다섯이
   * 같은 순간에 끝났다). 같은 사고 `PrismaWatchlistRepository.applyPrices`(2026-11-02). 시각은 Prisma 관례대로 UTC
   */
  async applyQuotes(quotes: Quote[]) {
    if (quotes.length === 0) return;
    const col = <T,>(pick: (q: Quote) => T) => quotes.map(pick);
    await prisma.$executeRaw`
      UPDATE market_assets AS a
      SET current_price = u.current_price, change_24h = u.change_24h, high_24h = u.high_24h, low_24h = u.low_24h,
          volume_24h = u.volume_24h, trade_value_24h = u.trade_value_24h, price_updated_at = (now() AT TIME ZONE 'UTC')
      FROM unnest(
        ${col((q) => q.symbol)}::text[], ${col((q) => q.currentPrice)}::numeric[], ${col((q) => q.change24h)}::numeric[],
        ${col((q) => q.high24h)}::numeric[], ${col((q) => q.low24h)}::numeric[], ${col((q) => q.volume24h)}::numeric[],
        ${col((q) => q.tradeValue24h)}::numeric[]
      ) AS u(symbol, current_price, change_24h, high_24h, low_24h, volume_24h, trade_value_24h)
      WHERE a.symbol = u.symbol`;
  }

}
