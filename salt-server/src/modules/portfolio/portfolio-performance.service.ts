import prisma from "../../config/database";

export class PortfolioPerformanceService {
  async getPerformance(userId: string, range: string) {
    const now = new Date();

    let since: Date;

    switch (range) {
      case "1d":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;

      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;

      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;

      case "90d":
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;

      default:
        since = new Date(0);
    }

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (!holdings.length) {
      return { points: [] };
    }

    const symbols = holdings.map((h) => h.symbol);

    const prices = await prisma.priceHistory.findMany({
      where: {
        symbol: { in: symbols },
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "asc" },
    });

    const grouped = new Map<number, number>();

    for (const price of prices) {
      const holding = holdings.find((h) => h.symbol === price.symbol);

      if (!holding) continue;

      const value = holding.totalQuantity * Number(price.close);

      const prev = grouped.get(price.timestamp.getTime()) ?? 0;

      grouped.set(price.timestamp.getTime(), prev + value);
    }

    const points = Array.from(grouped.entries()).map(([timestamp, value]) => ({
      timestamp,
      value,
    }));

    return { points };
  }
}
