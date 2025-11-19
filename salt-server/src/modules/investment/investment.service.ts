import prisma from "../../config/database";
import { NotFoundError, ConflictError } from "../../utils/error.util";
import { AddToWatchlistDto, QueryWatchlistDto } from "./investment.dto";
import { UpbitService } from "./upbit.service";

const UPBIT_IMAGE_URL = "https://static.upbit.com/logos/";

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
    period: "day" | "hour" = "day",
    count: number = 30
  ) {
    if (period === "day") {
      return await this.upbitService.getDailyCandles(symbol, count);
    } else {
      return await this.upbitService.getMinuteCandles(symbol, 60, count);
    }
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
   * 암호화폐 마켓 전체 조회 (상위 100개)
   */
  async getMarketOverview(limit: number = 100) {
    try {
      // 1. Upbit에서 모든 KRW 마켓 정보 가져오기
      const markets = await this.upbitService.getAllKRWMarkets();

      // 2. 상위 N개 심볼 추출
      const topSymbols = markets
        .slice(0, limit)
        .map((m: { symbol: string }) => m.symbol);

      // 3. 현재가 일괄 조회
      const prices = await this.upbitService.getCurrentPrices(topSymbols);

      // 4. 마켓 정보와 가격 정보 + 로고 합치기
      const overview = prices.map((price: { symbol: string }) => {
        const marketInfo = markets.find(
          (m: { symbol: string }) => m.symbol === price.symbol
        );
        return {
          ...price,
          koreanName: marketInfo?.koreanName,
          englishName: marketInfo?.englishName,
          logoUrl: `${UPBIT_IMAGE_URL}${price.symbol}.png`,
        };
      });

      // 5. 거래대금 순으로 정렬
      overview.sort(
        (a: { tradeValue24h: number }, b: { tradeValue24h: number }) =>
          b.tradeValue24h - a.tradeValue24h
      );

      return overview;
    } catch (error) {
      throw error;
    }
  }
}
