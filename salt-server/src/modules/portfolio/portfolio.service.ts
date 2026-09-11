import type { AssetType } from '@prisma/client';

import prisma from '../../shared/infrastructure/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/presentation/httpErrors';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  QueryTransactionsDto,
  QueryHoldingsDto,
} from './portfolio.dto';

/**
 * `PortfolioTransaction`·`PortfolioHolding` 의 유니크 키는 `(userId, symbol, assetType)` 이고
 * `assetType` 은 필수다. 그런데 **이 모듈의 DTO 는 `assetType` 을 받지 않는다** — 컬럼이
 * 나중에 추가되면서 코드가 따라오지 않았고, 그 결과 이 서비스는 컴파일도 되지 않았다.
 *
 * API 계약을 바꾸지 않고 고치기 위해 기본값을 둔다. 나머지 모듈이 전부
 * `assetType: "crypto"` 로 고정해 다루고 있어(`behavior-analysis` 의 "우선 crypto만") 같은 값이다.
 *
 * > 주식이 들어오면(F000·F001) DTO 에 `assetType` 을 추가하고 이 상수를 지운다.
 * > 그때 프론트·BFF 계약도 함께 바뀐다.
 */
const DEFAULT_ASSET_TYPE: AssetType = 'crypto';

export class PortfolioService {
  /**
   * 거래 내역 추가
   */
  async createTransaction(userId: string, data: CreateTransactionDto) {
    const symbol = data.symbol.toUpperCase();
    const totalAmount = data.quantity * data.price;
    const transactionDate = data.transactionDate
      ? new Date(data.transactionDate)
      : new Date();

    // 매도인 경우 보유 수량 확인
    if (data.transactionType === 'sell') {
      const holding = await prisma.portfolioHolding.findUnique({
        where: {
          userId_symbol_assetType: {
            userId,
            symbol,
            assetType: DEFAULT_ASSET_TYPE,
          },
        },
      });

      if (!holding || holding.totalQuantity < data.quantity) {
        throw new BadRequestError('Insufficient quantity to sell');
      }
    }

    // 트랜잭션 생성
    const transaction = await prisma.portfolioTransaction.create({
      data: {
        userId,
        symbol,
        transactionType: data.transactionType,
        quantity: data.quantity,
        price: data.price,
        totalAmount,
        fee: data.fee,
        note: data.note,
        transactionDate,
        assetType: DEFAULT_ASSET_TYPE,
      },
    });

    // 보유 자산 업데이트
    await this.updateHolding(userId, symbol, DEFAULT_ASSET_TYPE);

    return transaction;
  }

  /**
   * 보유 자산 계산 및 업데이트
   */
  private async updateHolding(
    userId: string,
    symbol: string,
    assetType: AssetType,
  ) {
    // 모든 거래 내역 조회 — 자산군이 다르면 다른 보유다
    const transactions = await prisma.portfolioTransaction.findMany({
      where: {
        userId,
        symbol,
        assetType,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    let totalQuantity = 0;
    let totalInvested = 0;
    let realizedProfit = 0;

    // 평균 매수가 계산 (FIFO)
    const buyQueue: Array<{ quantity: number; price: number }> = [];

    for (const tx of transactions) {
      if (tx.transactionType === 'buy') {
        totalQuantity += tx.quantity;
        totalInvested += tx.totalAmount + tx.fee;
        buyQueue.push({ quantity: tx.quantity, price: tx.price });
      } else if (tx.transactionType === 'sell') {
        totalQuantity -= tx.quantity;
        let remainingSell = tx.quantity;
        let costBasis = 0;

        // FIFO로 매수 원가 계산
        while (remainingSell > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const sellQty = Math.min(remainingSell, buy.quantity);

          costBasis += sellQty * buy.price;
          remainingSell -= sellQty;
          buy.quantity -= sellQty;

          if (buy.quantity === 0) {
            buyQueue.shift();
          }
        }

        // 실현 손익 = 매도금액 - 원가 - 수수료
        realizedProfit += tx.totalAmount - costBasis - tx.fee;
        totalInvested -= costBasis;
      }
    }

    // 평균 매수가
    const averageBuyPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    // 보유 자산 업데이트 또는 생성
    if (totalQuantity > 0) {
      await prisma.portfolioHolding.upsert({
        where: {
          userId_symbol_assetType: {
            userId,
            symbol,
            assetType,
          },
        },
        create: {
          userId,
          symbol,
          assetType,
          totalQuantity,
          averageBuyPrice,
          totalInvested,
          realizedProfit,
        },
        update: {
          totalQuantity,
          averageBuyPrice,
          totalInvested,
          realizedProfit,
        },
      });
    } else {
      // 수량이 0이면 삭제
      await prisma.portfolioHolding.deleteMany({
        where: {
          userId,
          symbol,
          assetType,
        },
      });
    }
  }

  /**
   * 거래 내역 조회
   */
  async getTransactions(userId: string, query: QueryTransactionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.symbol) {
      where.symbol = query.symbol.toUpperCase();
    }
    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) {
        where.transactionDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.transactionDate.lte = new Date(query.endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.portfolioTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.portfolioTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 보유 자산 조회
   */
  async getHoldings(userId: string, query: QueryHoldingsDto) {
    const where: any = { userId };
    if (query.symbol) {
      where.symbol = query.symbol.toUpperCase();
    }

    const holdings = await prisma.portfolioHolding.findMany({
      where,
      orderBy: { currentValue: 'desc' },
    });

    // 총 평가금액, 총 손익 계산
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalProfit = holdings.reduce(
      (sum, h) => sum + h.unrealizedProfit + h.realizedProfit,
      0
    );
    const totalProfitRate =
      totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      holdings,
      summary: {
        totalValue,
        totalInvested,
        totalProfit,
        totalProfitRate,
      },
    };
  }

  /**
   * 거래 내역 수정
   */
  async updateTransaction(
    userId: string,
    transactionId: string,
    data: UpdateTransactionDto
  ) {
    const transaction = await prisma.portfolioTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const updateData: any = {};
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
      updateData.totalAmount = data.quantity * (data.price || transaction.price);
    }
    if (data.price !== undefined) {
      updateData.price = data.price;
      updateData.totalAmount =
        (data.quantity || transaction.quantity) * data.price;
    }
    if (data.fee !== undefined) {
      updateData.fee = data.fee;
    }
    if (data.note !== undefined) {
      updateData.note = data.note;
    }
    if (data.transactionDate) {
      updateData.transactionDate = new Date(data.transactionDate);
    }

    const updated = await prisma.portfolioTransaction.update({
      where: { id: transactionId },
      data: updateData,
    });

    // 보유 자산 재계산
    await this.updateHolding(userId, transaction.symbol, transaction.assetType);

    return updated;
  }

  /**
   * 거래 내역 삭제
   */
  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await prisma.portfolioTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.portfolioTransaction.delete({
      where: { id: transactionId },
    });

    // 보유 자산 재계산
    await this.updateHolding(userId, transaction.symbol, transaction.assetType);

    return { message: 'Transaction deleted successfully' };
  }

  /**
   * 보유 자산 현재가 업데이트 (내부 API - BFF에서 호출)
   */
  async updateHoldingPrices(
    priceData: Array<{ symbol: string; currentPrice: number }>
  ) {
    for (const data of priceData) {
      const holdings = await prisma.portfolioHolding.findMany({
        where: { symbol: data.symbol.toUpperCase() },
      });

      for (const holding of holdings) {
        const currentValue = holding.totalQuantity * data.currentPrice;
        const unrealizedProfit =
          currentValue - holding.totalInvested;
        const unrealizedProfitRate =
          holding.totalInvested > 0
            ? (unrealizedProfit / holding.totalInvested) * 100
            : 0;

        await prisma.portfolioHolding.update({
          where: { id: holding.id },
          data: {
            currentPrice: data.currentPrice,
            currentValue,
            unrealizedProfit,
            unrealizedProfitRate,
          },
        });
      }
    }
  }

  /**
   * 포트폴리오 통계
   */
  async getPortfolioStats(userId: string) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    const transactions = await prisma.portfolioTransaction.findMany({
      where: { userId },
    });

    // 총 투자금액
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);

    // 현재 평가금액
    const currentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    // 미실현 손익
    const unrealizedProfit = holdings.reduce(
      (sum, h) => sum + h.unrealizedProfit,
      0
    );

    // 실현 손익
    const realizedProfit = holdings.reduce(
      (sum, h) => sum + h.realizedProfit,
      0
    );

    // 총 손익
    const totalProfit = unrealizedProfit + realizedProfit;

    // 수익률
    const profitRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // 최고/최저 수익 코인
    const sortedByProfit = [...holdings].sort(
      (a, b) => b.unrealizedProfitRate - a.unrealizedProfitRate
    );

    return {
      totalInvested,
      currentValue,
      unrealizedProfit,
      realizedProfit,
      totalProfit,
      profitRate,
      totalTransactions: transactions.length,
      holdingsCount: holdings.length,
      bestPerformer: sortedByProfit[0] || null,
      worstPerformer: sortedByProfit[sortedByProfit.length - 1] || null,
    };
  }
}
