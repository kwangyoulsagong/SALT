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
   * 암호화폐 마켓 전체 조회 (필터 + 정렬 + 페이지네이션)
   */
  async getMarketOverview(query: MarketOverviewQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 100;
    const sort: MarketOverviewSort = query.sort || "trade_value";
    const order: "asc" | "desc" = query.order || "desc";
    const period: MarketOverviewPeriod = query.period || "1d";
    const search = (query.search || "").trim().toLowerCase();

    try {
      // 1. KRW 마켓 전체
      const markets = await this.upbitService.getAllKRWMarkets(); // { symbol, koreanName, englishName }

      // 2. 검색 필터 (심볼 / 한글 / 영어)
      let filtered = markets;
      if (search) {
        filtered = markets.filter((m: any) => {
          return (
            m.symbol.toLowerCase().includes(search) ||
            m.koreanName.toLowerCase().includes(search) ||
            m.englishName.toLowerCase().includes(search)
          );
        });
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);

      // 3. 페이지네이션
      const start = (page - 1) * limit;
      const pagedMarkets = filtered.slice(start, start + limit);
      const symbols = pagedMarkets.map((m: any) => m.symbol);

      if (symbols.length === 0) {
        return {
          items: [],
          pagination: { page, limit, total, totalPages },
        };
      }

      // 4. 현재가/거래대금/24h변동률 한번에 조회
      const prices = await this.upbitService.getCurrentPrices(symbols);

      // 5. 마켓 + 가격 + 로고 머지
      const overview = prices.map((price: any) => {
        const marketInfo = pagedMarkets.find(
          (m: any) => m.symbol === price.symbol
        );

        return {
          symbol: price.symbol,
          market: price.market,
          koreanName: marketInfo?.koreanName,
          englishName: marketInfo?.englishName,
          currentPrice: price.currentPrice,
          change24h: price.change24h, // 24h 변동률
          high24h: price.high24h,
          low24h: price.low24h,
          volume24h: price.volume24h,
          tradeValue24h: price.tradeValue24h, // 거래대금
          logoUrl: `${UPBIT_IMAGE_URL}${price.symbol}.png`,
          // 아래는 기간 수익률용 필드 (일단 null로 초기화)
          changePeriod: null as number | null,
        };
      });

      // 6. 기간 수익률 계산 (1d/7d/1m/3m/6m/1y)
      if (period !== "1d") {
        const daysMap: Record<MarketOverviewPeriod, number> = {
          "1d": 1,
          "7d": 7,
          "1m": 30,
          "3m": 90,
          "6m": 180,
          "1y": 365,
        };
        const days = daysMap[period] || 1;

        await Promise.all(
          overview.map(
            async (item: { symbol: string; changePeriod: number | null }) => {
              try {
                const candles = await this.upbitService.getDailyCandles(
                  item.symbol,
                  days + 1
                );
                if (candles.length < 2) {
                  item.changePeriod = null;
                  return;
                }
                // Upbit 일봉은 최신 → 과거 순서라 가정
                const latest = candles[0].close;
                const past = candles[candles.length - 1].close;
                if (!past || past === 0) {
                  item.changePeriod = null;
                  return;
                }
                item.changePeriod = ((latest - past) / past) * 100;
              } catch (e) {
                item.changePeriod = null;
              }
            }
          )
        );
      } else {
        // 1d는 24h 변동률 재사용
        overview.forEach((item: { changePeriod: any; change24h: any }) => {
          item.changePeriod = item.change24h;
        });
      }

      // 7. 정렬
      const dir = order === "asc" ? 1 : -1;
      overview.sort(
        (
          a: {
            changePeriod: any;
            currentPrice: any;
            koreanName: any;
            englishName: any;
            tradeValue24h: any;
          },
          b: {
            changePeriod: any;
            currentPrice: any;
            koreanName: any;
            englishName: any;
            tradeValue24h: any;
          }
        ) => {
          switch (sort) {
            case "change":
              return (
                dir *
                (((a.changePeriod || 0) as number) -
                  ((b.changePeriod || 0) as number))
              );
            case "price":
              return dir * ((a.currentPrice || 0) - (b.currentPrice || 0));
            case "name": {
              const aName = (a.koreanName || a.englishName || "") as string;
              const bName = (b.koreanName || b.englishName || "") as string;
              return dir * aName.localeCompare(bName, "ko");
            }
            case "trade_value":
            default:
              return dir * ((a.tradeValue24h || 0) - (b.tradeValue24h || 0));
          }
        }
      );

      return {
        items: overview,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
