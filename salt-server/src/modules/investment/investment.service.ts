import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/error.util';
import { AddToWatchlistDto, QueryWatchlistDto } from './investment.dto';
import { UpbitService } from './upbit.service';

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
      throw new ConflictError('Already in watchlist');
    }

    // 실시간 가격 조회 (crypto만)
    let currentPrice = null;
    let priceChange24h = null;

    if (data.assetType === 'crypto') {
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
        orderBy: { addedAt: 'desc' },
      }),
      prisma.investmentWatchlist.count({ where }),
    ]);

    return {
      items,
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
      throw new NotFoundError('Watchlist item not found');
    }

    if (item.userId !== userId) {
      throw new NotFoundError('Watchlist item not found');
    }

    await prisma.investmentWatchlist.delete({
      where: { id: watchlistId },
    });

    return { message: 'Removed from watchlist successfully' };
  }

  /**
   * 실시간 가격 조회 (Upbit)
   */
  async getRealTimePrice(symbol: string) {
    const priceData = await this.upbitService.getCurrentPrice(symbol);
    return priceData;
  }

  /**
   * 차트 데이터 조회
   */
  async getChartData(symbol: string, period: 'day' | 'hour' = 'day', count: number = 30) {
    if (period === 'day') {
      return await this.upbitService.getDailyCandles(symbol, count);
    } else {
      return await this.upbitService.getMinuteCandles(symbol, 60, count);
    }
  }

  /**
   * 관심목록 가격 일괄 업데이트 (내부 API용)
   */
  async updateWatchlistPrices(symbols: string[]) {
    const updates = [];

    for (const symbol of symbols) {
      try {
        const priceData = await this.upbitService.getCurrentPrice(symbol);

        updates.push(
          prisma.investmentWatchlist.updateMany({
            where: { 
              symbol: symbol.toUpperCase(),
              assetType: 'crypto',
            },
            data: {
              currentPrice: priceData.currentPrice,
              priceChange24h: priceData.change24h,
              lastUpdated: new Date(),
            },
          })
        );
      } catch (error) {
        // 개별 심볼 업데이트 실패는 무시
      }
    }

    await Promise.all(updates);
    return { updated: updates.length };
  }

  /**
   * 모든 관심목록 심볼 조회 (내부 API용)
   */
  async getAllWatchlistSymbols() {
    const result = await prisma.investmentWatchlist.findMany({
      where: { assetType: 'crypto' },
      select: { symbol: true },
      distinct: ['symbol'],
    });

    return result.map((item) => item.symbol);
  }
}
