import prisma from "../../config/database";

export type MarketRegime =
  | "bullish"
  | "bearish"
  | "panic"
  | "euphoric"
  | "sideways";

export class MarketRegimeService {
  async detectRegime(symbol: string = "BTC"): Promise<MarketRegime> {
    const [indicator, sentiment] = await Promise.all([
      prisma.technicalIndicator.findFirst({
        where: { symbol },
        orderBy: { timestamp: "desc" },
      }),
      prisma.marketSentiment.findFirst({
        where: { symbol },
        orderBy: { calculatedAt: "desc" },
      }),
    ]);

    if (!indicator && !sentiment) return "sideways";

    const rsi = indicator?.rsi14 ?? 50;
    const fearGreed = sentiment?.fearGreedIndex ?? 50;

    if (fearGreed < 25 && rsi < 30) return "panic";
    if (fearGreed > 75 && rsi > 70) return "euphoric";
    if (rsi >= 60) return "bullish";
    if (rsi <= 40) return "bearish";

    return "sideways";
  }
}
