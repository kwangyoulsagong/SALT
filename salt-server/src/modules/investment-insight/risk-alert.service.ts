import prisma from "../../config/database";

export class RiskAlertService {
  async generateRiskAlerts(userId: string) {
    const profile = await prisma.userInvestmentProfile.findUnique({
      where: { userId },
    });

    const maxWeight = profile?.maxSingleAssetWeight ?? 0.6;

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      orderBy: { currentValue: "desc" },
    });

    if (holdings.length === 0) return [];

    const totalValue = holdings.reduce(
      (sum, h) => sum + Number(h.currentValue ?? 0),
      0,
    );

    if (totalValue <= 0) return [];

    const alerts = [];

    for (const holding of holdings) {
      const currentValue = Number(holding.currentValue ?? 0);
      const weight = currentValue / totalValue;
      const unrealizedProfitRate = Number(holding.unrealizedProfitRate ?? 0);

      /**
       * 1) Concentration Risk
       */
      if (weight > maxWeight) {
        const overRatio = (weight - maxWeight) / maxWeight;
        const severity = Math.min(
          100,
          Math.max(40, Math.round(overRatio * 100)),
        );

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
            summary: `${holding.symbol} 비중이 ${(weight * 100).toFixed(1)}%로 기준치 ${(maxWeight * 100).toFixed(1)}%를 초과했습니다.`,
            severity,
            confidence: 0.9,
            payload: {
              riskType: "concentration",
              symbol: holding.symbol,
              weight,
              threshold: maxWeight,
              currentValue,
              totalValue,
            },
            dedupeKey: `concentration:${holding.symbol}`,
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          },
          update: {
            summary: `${holding.symbol} 비중이 ${(weight * 100).toFixed(1)}%로 기준치 ${(maxWeight * 100).toFixed(1)}%를 초과했습니다.`,
            severity,
            confidence: 0.9,
            payload: {
              riskType: "concentration",
              symbol: holding.symbol,
              weight,
              threshold: maxWeight,
              currentValue,
              totalValue,
            },
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          },
        });

        alerts.push(insight);
      }

      /**
       * 2) Drawdown Risk
       * -15% 이하 손실이면 경고
       */
      if (unrealizedProfitRate <= -0.15) {
        const severity = Math.min(
          100,
          Math.max(45, Math.round(Math.abs(unrealizedProfitRate) * 200)),
        );

        const insight = await prisma.investmentInsight.upsert({
          where: {
            userId_type_dedupeKey: {
              userId,
              type: "risk_alert",
              dedupeKey: `drawdown:${holding.symbol}`,
            },
          },
          create: {
            userId,
            symbol: holding.symbol,
            assetType: holding.assetType,
            type: "risk_alert",
            title: "평가손실 위험",
            summary: `${holding.symbol}의 평가손실이 ${(unrealizedProfitRate * 100).toFixed(1)}%입니다.`,
            severity,
            confidence: 0.85,
            payload: {
              riskType: "drawdown",
              symbol: holding.symbol,
              lossRate: unrealizedProfitRate,
              invested: Number(holding.totalInvested ?? 0),
              currentValue,
            },
            dedupeKey: `drawdown:${holding.symbol}`,
            expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
          },
          update: {
            summary: `${holding.symbol}의 평가손실이 ${(unrealizedProfitRate * 100).toFixed(1)}%입니다.`,
            severity,
            confidence: 0.85,
            payload: {
              riskType: "drawdown",
              symbol: holding.symbol,
              lossRate: unrealizedProfitRate,
              invested: Number(holding.totalInvested ?? 0),
              currentValue,
            },
            expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
          },
        });

        alerts.push(insight);
      }
    }

    return alerts;
  }
}
