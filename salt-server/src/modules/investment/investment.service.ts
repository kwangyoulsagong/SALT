import prisma from "../../config/database";
import { NotFoundError, ConflictError } from "../../utils/error.util";
import { AddToWatchlistDto, QueryWatchlistDto } from "./investment.dto";
import { UpbitService } from "./upbit.service";

const UPBIT_IMAGE_URL = "https://static.upbit.com/logos/";

type MarketOverviewSort =
  | "trade_value" // 거래대금
  | "change" // 변동률
  | "price" // 가격
  | "name"; // 가나다(이름)

type MarketOverviewPeriod = "1d" | "7d" | "1m" | "3m" | "6m" | "1y";

interface MarketOverviewQuery {
  page?: number;
  limit?: number;
  sort?: MarketOverviewSort;
  order?: "asc" | "desc";
  period?: MarketOverviewPeriod;
  search?: string;
}

export class InvestmentService {
  private upbitService = new UpbitService();

  /**
   * 관심 목록에 추가
   */
  async addToWatchlist(userId: string, data: AddToWatchlistDto) {
    // 중복 확인
    const existing = await prisma.investmentWatchlist.findUnique({
      where: {
        userId_assetType_symbol: {
          userId,
          assetType: data.assetType,
          symbol: data.symbol.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictError("Already in watchlist");
    }

    // 실시간 가격 조회 (crypto만)
    let currentPrice = null;
    let priceChange24h = null;

    if (data.assetType === "crypto") {
      try {
        const priceData = await this.upbitService.getCurrentPrice(data.symbol);
        currentPrice = priceData.currentPrice;
        priceChange24h = priceData.change24h;
      } catch (error) {
        // 가격 조회 실패해도 관심목록 추가는 진행
      }
    }

    // 관심 목록 추가
    const watchlist = await prisma.investmentWatchlist.create({
      data: {
        userId,
        assetType: data.assetType,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        currentPrice,
        priceChange24h,
        lastUpdated: new Date(),
      },
    });

    return watchlist;
  }

  /**
   * 관심 목록 조회
   */
  async getWatchlist(userId: string, query: QueryWatchlistDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.assetType) {
      where.assetType = query.assetType;
    }

    const [items, total] = await Promise.all([
      prisma.investmentWatchlist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { addedAt: "desc" },
      }),
      prisma.investmentWatchlist.count({ where }),
    ]);

    // 로고 URL 추가
    const itemsWithLogo = items.map((item) => ({
      ...item,
      logoUrl: `${UPBIT_IMAGE_URL}${item.symbol}.png`,
    }));

    return {
      items: itemsWithLogo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 관심 목록에서 제거
   */
  async removeFromWatchlist(userId: string, watchlistId: string) {
    const item = await prisma.investmentWatchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!item) {
      throw new NotFoundError("Watchlist item not found");
    }

    if (item.userId !== userId) {
      throw new NotFoundError("Watchlist item not found");
    }

    await prisma.investmentWatchlist.delete({
      where: { id: watchlistId },
    });

    return { message: "Removed from watchlist successfully" };
  }

  /**
   * 실시간 가격 조회 (Upbit)
   */
  async getRealTimePrice(symbol: string) {
    const priceData = await this.upbitService.getCurrentPrice(symbol);
    return {
      ...priceData,
      logoUrl: `${UPBIT_IMAGE_URL}${symbol.toUpperCase()}.png`,
    };
  }

  /**
   * 차트 데이터 조회
   */
  async getChartData(
    symbol: string,
    period: "day" | "minute" = "day",
    count: number = 30,
    unit: 1 | 3 | 5 | 15 | 30 | 60 | 240 = 5
  ) {
    if (period === "day") {
      return await this.upbitService.getDailyCandles(symbol, count);
    }

    // 분봉 요청
    return await this.upbitService.getMinuteCandles(symbol, unit, count);
  }

  /**
   * 모든 관심목록 심볼 조회 (BFF용 Internal API)
   */
  async getAllWatchlistSymbols() {
    const result = await prisma.investmentWatchlist.findMany({
      where: { assetType: "crypto" },
      select: { symbol: true },
      distinct: ["symbol"],
    });

    return result.map((item) => item.symbol);
  }

  /**
   * 관심목록 가격 일괄 업데이트 (BFF용 Internal API)
   */
  async updateWatchlistPrices(
    priceData: Array<{
      symbol: string;
      currentPrice: number;
      priceChange24h: number;
    }>
  ) {
    const updates = priceData.map((data) =>
      prisma.investmentWatchlist.updateMany({
        where: {
          symbol: data.symbol.toUpperCase(),
          assetType: "crypto",
        },
        data: {
          currentPrice: data.currentPrice,
          priceChange24h: data.priceChange24h,
          lastUpdated: new Date(),
        },
      })
    );

    await Promise.all(updates);
    return { updated: priceData.length };
  }

  /**
   * 🔥 IMPROVED: DB 우선 조회 + 비동기 가격 업데이트
   * 1. DB에서 캐시된 가격 즉시 반환 (빠른 초기 로딩)
   * 2. 백그라운드에서 Upbit API로 최신 가격 업데이트
   */
  async getMarketOverview(query: MarketOverviewQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 100;
    const sort: MarketOverviewSort = query.sort || "trade_value";
    const order: "asc" | "desc" = query.order || "desc";
    const search = (query.search || "").trim().toLowerCase();

    try {
      // 1. 🔥 DB에서 마켓 정보 조회 (가격 포함)
      const where: any = { isActive: true };

      // 검색 조건
      if (search) {
        where.OR = [
          { symbol: { contains: search, mode: "insensitive" } },
          { koreanName: { contains: search, mode: "insensitive" } },
          { englishName: { contains: search, mode: "insensitive" } },
        ];
      }

      // 정렬 설정
      let orderBy: any = {};
      switch (sort) {
        case "trade_value":
          orderBy = { tradeValue24h: order };
          break;
        case "change":
          orderBy = { change24h: order };
          break;
        case "price":
          orderBy = { currentPrice: order };
          break;
        case "name":
          orderBy = { koreanName: order };
          break;
        default:
          orderBy = { tradeValue24h: "desc" };
      }

      // DB에서 페이징 처리하여 조회
      const [items, total] = await Promise.all([
        prisma.marketAsset.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.marketAsset.count({ where }),
      ]);

      // 2. 응답 데이터 구성 (DB 데이터 그대로 사용)
      const overview = items.map((item) => ({
        symbol: item.symbol,
        market: item.market,
        koreanName: item.koreanName,
        englishName: item.englishName,
        currentPrice: item.currentPrice ? Number(item.currentPrice) : 0,
        change24h: item.change24h ? Number(item.change24h) : 0,
        high24h: item.high24h ? Number(item.high24h) : 0,
        low24h: item.low24h ? Number(item.low24h) : 0,
        volume24h: item.volume24h ? Number(item.volume24h) : 0,
        tradeValue24h: item.tradeValue24h ? Number(item.tradeValue24h) : 0,
        logoUrl:
          item.logoUrl || `https://static.upbit.com/logos/${item.symbol}.png`,
        priceUpdatedAt: item.priceUpdatedAt,
      }));

      // 3. 🔥 백그라운드에서 가격 업데이트 (응답 대기하지 않음)
      this.updateMarketPricesInBackground(items.map((i) => i.symbol));

      return {
        items: overview,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🔥 백그라운드에서 마켓 가격 업데이트
   * 응답을 기다리지 않고 비동기로 실행
   */
  private async updateMarketPricesInBackground(symbols: string[]) {
    try {
      // 10분 이내에 업데이트된 건 스킵
      const TEN_MINUTES = 10 * 60 * 1000;
      const now = new Date();

      // 업데이트가 필요한 심볼만 필터
      const needsUpdate = await prisma.marketAsset.findMany({
        where: {
          symbol: { in: symbols },
          OR: [
            { priceUpdatedAt: null },
            { priceUpdatedAt: { lt: new Date(now.getTime() - TEN_MINUTES) } },
          ],
        },
        select: { symbol: true },
      });

      if (needsUpdate.length === 0) return;

      const symbolsToUpdate = needsUpdate.map((item) => item.symbol);

      // Upbit API에서 최신 가격 조회
      const prices = await this.upbitService.getCurrentPrices(symbolsToUpdate);

      // DB 업데이트 (배치)
      const updates = prices.map((price: any) =>
        prisma.marketAsset.update({
          where: { symbol: price.symbol },
          data: {
            currentPrice: price.currentPrice,
            change24h: price.change24h,
            high24h: price.high24h,
            low24h: price.low24h,
            volume24h: price.volume24h,
            tradeValue24h: price.tradeValue24h,
            priceUpdatedAt: new Date(),
          },
        })
      );

      await Promise.all(updates);
      console.log(`Updated prices for ${updates.length} symbols`);
    } catch (error) {
      console.error("Background price update failed:", error);
      // 백그라운드 작업이므로 에러를 throw하지 않음
    }
  }

  /**
   * 🔥 Worker가 주기적으로 호출할 전체 가격 업데이트
   * (예: 1분마다 실행)
   */
  async updateAllMarketPrices() {
    try {
      // 모든 활성 마켓 조회
      const markets = await prisma.marketAsset.findMany({
        where: { isActive: true },
        select: { symbol: true },
      });

      const symbols = markets.map((m) => m.symbol);

      // 배치로 나누어 처리 (100개씩)
      const BATCH_SIZE = 100;
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);

        const prices = await this.upbitService.getCurrentPrices(batch);

        const updates = prices.map((price: any) =>
          prisma.marketAsset.update({
            where: { symbol: price.symbol },
            data: {
              currentPrice: price.currentPrice,
              change24h: price.change24h,
              high24h: price.high24h,
              low24h: price.low24h,
              volume24h: price.volume24h,
              tradeValue24h: price.tradeValue24h,
              priceUpdatedAt: new Date(),
            },
          })
        );

        await Promise.all(updates);
        console.log(
          `Batch ${i / BATCH_SIZE + 1}: Updated ${updates.length} prices`
        );

        // API 제한 방지
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { updated: symbols.length };
    } catch (error) {
      console.error("Market price update error:", error);
      throw error;
    }
  }

  /**
   * 🔥 NEW: 마켓 오버뷰 정렬 헬퍼 메서드
   */
  private sortMarketOverview(
    overview: any[],
    sort: MarketOverviewSort,
    order: "asc" | "desc"
  ) {
    const dir = order === "asc" ? 1 : -1;

    overview.sort((a, b) => {
      switch (sort) {
        case "change":
          return dir * ((a.changePeriod || 0) - (b.changePeriod || 0));
        case "price":
          return dir * ((a.currentPrice || 0) - (b.currentPrice || 0));
        case "name": {
          const aName = a.koreanName || a.englishName || "";
          const bName = b.koreanName || b.englishName || "";
          return dir * aName.localeCompare(bName, "ko");
        }
        case "trade_value":
        default:
          return dir * ((a.tradeValue24h || 0) - (b.tradeValue24h || 0));
      }
    });
  }

  /**
   * 🔥 NEW: 마켓 오버뷰 캐싱 (선택적 구현)
   * 동일한 쿼리가 1분 이내에 오면 캐시된 데이터 반환
   */
  private marketCache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 60 * 1000; // 1분

  async getCachedMarketOverview(query: MarketOverviewQuery) {
    const cacheKey = JSON.stringify(query);
    const cached = this.marketCache.get(cacheKey);

    // 캐시가 유효하면 반환
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // 새로 조회
    const data = await this.getMarketOverview(query);

    // 캐시 저장
    this.marketCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // 오래된 캐시 정리
    this.cleanupMarketCache();

    return data;
  }

  private cleanupMarketCache() {
    const now = Date.now();
    for (const [key, value] of this.marketCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL * 2) {
        this.marketCache.delete(key);
      }
    }
  }
  async getAllMarketSymbols() {
    try {
      const rows = await prisma.marketAsset.findMany({
        where: { isActive: true }, // 상폐된 코인 제외
        select: { symbol: true }, // symbol만 추출
      });

      // 🔥 비어있거나 undefined면 fallback
      if (!rows || rows.length === 0) return [];

      // 🔧 null-safe Filtering
      return rows
        .map((r) => r.symbol)
        .filter((s) => typeof s === "string" && s.trim() !== "");
    } catch (err) {
      // ⛑ 에러가 있어도 BFF는 죽지 않아야 함
      console.error("❌ getAllMarketSymbols DB Error:", err);
      return []; // fallback
    }
  }
}
