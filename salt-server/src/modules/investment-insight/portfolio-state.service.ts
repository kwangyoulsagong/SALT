import prisma from "../../config/database";

export type PortfolioState = {
  totalValue: number;
  concentration: number;
  largestAsset?: string;
  riskLevel: "low" | "medium" | "high";
  diversificationScore: number;
};

export class PortfolioStateService {
  async analyze(userId: string): Promise<PortfolioState> {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (holdings.length === 0) {
      return {
        totalValue: 0,
        concentration: 0,
        riskLevel: "low",
        diversificationScore: 0,
      };
    }

    const totalValue = holdings.reduce(
      (sum, h) => sum + Number(h.currentValue ?? 0),
      0,
    );

    if (totalValue <= 0) {
      return {
        totalValue: 0,
        concentration: 0,
        riskLevel: "low",
        diversificationScore: 0,
      };
    }

    let largestWeight = 0;
    let largestAsset = "";

    for (const h of holdings) {
      const weight = Number(h.currentValue ?? 0) / totalValue;
      if (weight > largestWeight) {
        largestWeight = weight;
        largestAsset = h.symbol;
      }
    }

    let riskLevel: "low" | "medium" | "high" = "low";
    if (largestWeight > 0.7) riskLevel = "high";
    else if (largestWeight > 0.4) riskLevel = "medium";

    return {
      totalValue,
      concentration: largestWeight,
      largestAsset,
      riskLevel,
      diversificationScore: Math.min(
        100,
        Math.round((1 - largestWeight) * 100),
      ),
    };
  }
}
