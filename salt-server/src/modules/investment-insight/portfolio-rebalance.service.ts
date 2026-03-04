import prisma from "../../config/database";

export class PortfolioRebalanceService {
  async generateRebalance(userId: string) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (holdings.length === 0) return [];

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.currentValue ?? 0),
      0,
    );

    const recommendations = [];

    for (const holding of holdings) {
      const weight = (holding.currentValue ?? 0) / totalValue;

      // 목표 비중
      const targetWeight = 0.25;

      const diff = weight - targetWeight;

      if (Math.abs(diff) < 0.05) continue;

      const action = diff > 0 ? "reduce" : "increase";

      const insight = await prisma.investmentInsight.upsert({
        where: {
          userId_type_dedupeKey: {
            userId,
            type: "rebalance",
            dedupeKey: `rebalance:${holding.symbol}`,
          },
        },

        create: {
          userId,
          symbol: holding.symbol,
          assetType: holding.assetType,
          type: "rebalance",
          title: "포트폴리오 리밸런싱 추천",
          summary: `${holding.symbol} 비중 조정 추천`,
          severity: 50,
          confidence: 0.75,
          payload: {
            symbol: holding.symbol,
            currentWeight: weight,
            targetWeight,
            action,
          },
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },

        update: {
          payload: {
            symbol: holding.symbol,
            currentWeight: weight,
            targetWeight,
            action,
          },
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      });

      recommendations.push(insight);
    }

    return recommendations;
  }
}
