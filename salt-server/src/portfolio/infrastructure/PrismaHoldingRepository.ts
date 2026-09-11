import prisma from "../../shared/infrastructure/prisma";
import type {
  Holding,
  HoldingRepository,
  HoldingSnapshot,
  PortfolioAssetType,
} from "../domain";

export class PrismaHoldingRepository implements HoldingRepository {
  findOne(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType
  ): Promise<Holding | null> {
    return prisma.portfolioHolding.findUnique({
      where: { userId_symbol_assetType: { userId, symbol, assetType } },
    });
  }

  findByUser(userId: string, symbol?: string): Promise<Holding[]> {
    return prisma.portfolioHolding.findMany({
      where: { userId, ...(symbol ? { symbol } : {}) },
      orderBy: { currentValue: "desc" },
    });
  }

  findBySymbol(symbol: string): Promise<Holding[]> {
    return prisma.portfolioHolding.findMany({ where: { symbol } });
  }

  /**
   * 재계산 결과 저장.
   *
   * `Decimal` → `number` 변환이 **여기서 한 번** 일어난다. 컬럼이 `Float` 이기 때문이고
   * (`DB-REQ-007` 이 `Decimal` 로 승격한다) 도메인 계산은 그 사실을 모른다.
   */
  async save(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType,
    snapshot: HoldingSnapshot
  ): Promise<void> {
    const values = {
      totalQuantity: snapshot.totalQuantity.toNumber(),
      averageBuyPrice: snapshot.averageBuyPrice.toNumber(),
      totalInvested: snapshot.totalInvested.toNumber(),
      realizedProfit: snapshot.realizedProfit.toNumber(),
    };

    await prisma.portfolioHolding.upsert({
      where: { userId_symbol_assetType: { userId, symbol, assetType } },
      create: { userId, symbol, assetType, ...values },
      update: values,
    });
  }

  async remove(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType
  ): Promise<void> {
    await prisma.portfolioHolding.deleteMany({
      where: { userId, symbol, assetType },
    });
  }

  async applyValuation(
    holdingId: string,
    valuation: {
      currentPrice: number;
      currentValue: number;
      unrealizedProfit: number;
      unrealizedProfitRate: number;
    }
  ): Promise<void> {
    await prisma.portfolioHolding.update({
      where: { id: holdingId },
      data: valuation,
    });
  }
}
