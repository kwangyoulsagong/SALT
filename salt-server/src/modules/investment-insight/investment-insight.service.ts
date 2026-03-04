import prisma from "../../config/database";

export class InvestmentInsightService {
  /**
   * 포트폴리오 위험 분석
   */
  async generateRiskAlerts(userId: string) {
    const profile = await prisma.userInvestmentProfile.findUnique({
      where: { userId },
    });

    const maxWeight = profile?.maxSingleAssetWeight ?? 0.6;

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (holdings.length === 0) return [];

    const totalValue = holdings.reduce(
      (sum: number, h: { currentValue: number }) => sum + (h.currentValue ?? 0),
      0,
    );

    if (totalValue <= 0) return [];

    const alerts = [];

    for (const holding of holdings) {
      const weight = (holding.currentValue ?? 0) / totalValue;

      if (weight >= maxWeight) {
        const severity = Math.min(100, Math.round((weight - maxWeight) * 200));

        const insight = await prisma.investmentInsight.upsert({
          where: {
            userId_type_dedupeKey: {
              userId,
              type: "risk_alert",
              dedupeKey: `concentration:${holding.symbol}`,
            },
          },
          create: {
            userId,
            symbol: holding.symbol,
            assetType: holding.assetType,
            type: "risk_alert",
            title: "자산 집중 위험",
            summary: `${holding.symbol} 비중이 ${(weight * 100).toFixed(1)}% 입니다.`,
            severity,
            confidence: 0.9,
            payload: {
              symbol: holding.symbol,
              weight,
              maxWeight,
              totalValue,
            },
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          },
          update: {
            severity,
            summary: `${holding.symbol} 비중이 ${(weight * 100).toFixed(1)}% 입니다.`,
            payload: {
              symbol: holding.symbol,
              weight,
              maxWeight,
              totalValue,
            },
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          },
        });

        alerts.push(insight);
      }
    }

    return alerts;
  }

  /**
   * 사용자 인사이트 조회
   */
  async getUserInsights(userId: string) {
    return prisma.investmentInsight.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
  }

  async generateSmartBuyZone() {
    const sentiments = await prisma.marketSentiment.findMany({
      orderBy: {
        calculatedAt: "desc",
      },
      take: 50,
    });

    const insights = [];

    for (const s of sentiments) {
      const isFear = (s.fearGreedIndex ?? 50) <= 35;
      const priceDrop = s.priceChange24h <= -4;

      const severity = Math.min(
        100,
        Math.round(Math.abs(s.priceChange24h) * 3),
      );

      if (isFear && priceDrop) {
        const insight = await prisma.investmentInsight.upsert({
          where: {
            userId_type_dedupeKey: {
              userId: "global",
              type: "smart_buy_zone",
              dedupeKey: `buy:${s.symbol}`,
            },
          },

          create: {
            userId: "global",
            symbol: s.symbol,
            assetType: "crypto",
            type: "smart_buy_zone",
            title: "Smart Buy Zone",
            summary: `${s.symbol} 공포 구간 + 가격 하락 → 매수 구간 가능성`,
            severity,
            confidence: 0.7,
            payload: {
              fearGreedIndex: s.fearGreedIndex,
              priceChange24h: s.priceChange24h,
            },
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          },

          update: {
            summary: `${s.symbol} 공포 구간 + 가격 하락 → 매수 구간 가능성`,
            confidence: 0.7,
            payload: {
              fearGreedIndex: s.fearGreedIndex,
              priceChange24h: s.priceChange24h,
            },
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          },
        });

        insights.push(insight);
      }
    }

    return insights;
  }
}
