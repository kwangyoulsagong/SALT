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
    const indicators = await prisma.technicalIndicator.findMany({
      where: {
        timeframe: "m5",
      },
      orderBy: {
        timestamp: "desc",
      },
      distinct: ["symbol"],
    });

    const sentiments = await prisma.marketSentiment.findMany({
      orderBy: { calculatedAt: "desc" },
      distinct: ["symbol"],
    });

    const sentimentMap = new Map(sentiments.map((s) => [s.symbol, s]));

    const insights = [];

    for (const indicator of indicators) {
      const sentiment = sentimentMap.get(indicator.symbol);

      if (!indicator.rsi14 || !indicator.ma20) continue;

      const asset = await prisma.marketAsset.findUnique({
        where: { symbol: indicator.symbol },
        select: { currentPrice: true },
      });

      const currentPrice = Number(asset?.currentPrice ?? 0);
      const fearGreed = sentiment?.fearGreedIndex ?? 50;

      const rsiSignal = indicator.rsi14 < 35;
      const maSignal = currentPrice < indicator.ma20 * 0.97;
      const fearSignal = fearGreed < 40;

      if (!rsiSignal || !maSignal || !fearSignal) continue;

      const severity = Math.min(100, Math.round((35 - indicator.rsi14) * 3));

      const insight = await prisma.investmentInsight.upsert({
        where: {
          userId_type_dedupeKey: {
            userId: "global",
            type: "smart_buy_zone",
            dedupeKey: `buy:${indicator.symbol}`,
          },
        },
        create: {
          userId: "global",
          symbol: indicator.symbol,
          assetType: indicator.assetType,
          type: "smart_buy_zone",
          title: "Smart Buy Zone",
          summary: `${indicator.symbol} RSI ${indicator.rsi14.toFixed(
            1,
          )} + Fear ${fearGreed}`,
          severity,
          confidence: 0.8,
          payload: {
            rsi: indicator.rsi14,
            ma20: indicator.ma20,
            currentPrice,
            fearGreed,
          },
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
        update: {
          summary: `${indicator.symbol} RSI ${indicator.rsi14.toFixed(
            1,
          )} + Fear ${fearGreed}`,
          payload: {
            rsi: indicator.rsi14,
            ma20: indicator.ma20,
            currentPrice,
            fearGreed,
          },
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      });

      insights.push(insight);
    }

    return insights;
  }
}
