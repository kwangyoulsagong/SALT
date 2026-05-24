import prisma from "../../config/database";

export class DashboardService {
  async getDashboard(userId: string) {
    /**
     * 1. 포트폴리오 보유 자산
     */
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      orderBy: { currentValue: "desc" },
    });

    const totalValue = holdings.reduce(
      (sum, h) => sum + Number(h.currentValue ?? 0),
      0,
    );

    const totalInvested = holdings.reduce(
      (sum, h) => sum + Number(h.totalInvested ?? 0),
      0,
    );

    const totalProfit = holdings.reduce(
      (sum, h) =>
        sum + Number(h.unrealizedProfit ?? 0) + Number(h.realizedProfit ?? 0),
      0,
    );

    const profitRate =
      totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    /**
     * 2. 포트폴리오 비중
     */
    const allocation = holdings.map((h) => ({
      symbol: h.symbol,
      value: h.currentValue,
      weight: totalValue > 0 ? Number(h.currentValue ?? 0) / totalValue : 0,
      profitRate: h.unrealizedProfitRate,
    }));

    /**
     * 3. 최근 인사이트
     */
    const insights = await prisma.investmentInsight.findMany({
      where: {
        AND: [
          {
            OR: [{ userId }, { userId: "global" }],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    /**
     * 4. 최근 전략 트리거
     */
    const triggers = await prisma.playbookTrigger.findMany({
      where: {
        userId,
        status: "open",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    /**
     * 5. 최고 / 최악 자산
     */
    const sortedByProfit = [...holdings].sort(
      (a, b) => (b.unrealizedProfitRate ?? 0) - (a.unrealizedProfitRate ?? 0),
    );

    const bestPerformer = sortedByProfit[0] ?? null;
    const worstPerformer = sortedByProfit[sortedByProfit.length - 1] ?? null;

    return {
      portfolio: {
        totalValue,
        totalInvested,
        totalProfit,
        profitRate,
        holdingsCount: holdings.length,
      },

      allocation,

      performers: {
        best: bestPerformer,
        worst: worstPerformer,
      },

      insights,

      triggers,
    };
  }
}
