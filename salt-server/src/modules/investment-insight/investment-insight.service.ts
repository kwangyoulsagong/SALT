import prisma from "../../config/database";

export class InvestmentInsightService {
  private calculateRSI(prices: number[], period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];

      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  private calculateMA(prices: number[], period: number) {
    if (prices.length < period) return null;

    const slice = prices.slice(0, period);
    const sum = slice.reduce((a, b) => a + b, 0);

    return sum / period;
  }

  private calculateVolatility(prices: number[]) {
    if (prices.length < 10) return null;

    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;

    return Math.sqrt(variance) / mean;
  }

  private async processSymbol(symbol: string, sentiment?: any) {
    const history = await prisma.priceHistory.findMany({
      where: { symbol, timeframe: "5m" },
      orderBy: { timestamp: "desc" },
      take: 60,
    });

    if (history.length < 30) return null;

    const prices = history.map((h) => Number(h.close)).reverse();

    const rsi = this.calculateRSI(prices);
    const ma20 = this.calculateMA(prices, 20);
    const currentPrice = prices[prices.length - 1];
    const volatility = this.calculateVolatility(prices);

    const fearGreed = sentiment?.fearGreedIndex ?? 50;

    const rsiSignal = rsi !== null && rsi < 35;
    const maSignal = ma20 !== null && currentPrice < ma20 * 0.97;
    const fearSignal = fearGreed < 40;

    if (!rsiSignal || !maSignal || !fearSignal) return null;

    const severity = Math.min(100, Math.round((35 - (rsi ?? 35)) * 3));

    return prisma.investmentInsight.upsert({
      where: {
        userId_type_dedupeKey: {
          userId: "global",
          type: "smart_buy_zone",
          dedupeKey: `buy:${symbol}`,
        },
      },
      create: {
        userId: "global",
        symbol,
        assetType: "crypto",
        type: "smart_buy_zone",
        title: "Smart Buy Zone",
        summary: `${symbol} RSI ${rsi?.toFixed(1)} + Fear ${fearGreed}`,
        severity,
        confidence: 0.8,
        payload: { rsi, ma20, currentPrice, volatility, fearGreed },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      update: {
        summary: `${symbol} RSI ${rsi?.toFixed(1)} + Fear ${fearGreed}`,
        payload: { rsi, ma20, currentPrice, volatility, fearGreed },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  }

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
    const symbols = await prisma.marketAsset.findMany({
      where: { isActive: true },
      select: { symbol: true },
    });

    const sentiments = await prisma.marketSentiment.findMany({
      orderBy: { calculatedAt: "desc" },
      distinct: ["symbol"],
    });

    const sentimentMap = new Map(sentiments.map((s) => [s.symbol, s]));

    const insights = [];
    const BATCH = 20;

    for (let i = 0; i < symbols.length; i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map((s) =>
          this.processSymbol(s.symbol, sentimentMap.get(s.symbol)),
        ),
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          insights.push(r.value);
        }
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    return insights;
  }
}
