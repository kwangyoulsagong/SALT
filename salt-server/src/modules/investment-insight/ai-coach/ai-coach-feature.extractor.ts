import prisma from "../../../config/database";
import { Timeframe } from "@prisma/client";
import { MarketRegimeService } from "../market-regime.service";
import { PortfolioStateService } from "../portfolio-state.service";
import type {
  AICoachContext,
  SymbolFeature,
  WhaleFlow,
} from "./ai-coach.types";

export class AICoachFeatureExtractor {
  private regimeService = new MarketRegimeService();
  private portfolioStateService = new PortfolioStateService();

  async extract(userId: string): Promise<AICoachContext | null> {
    const [marketRegime, portfolioState, holdings, profile, insights] =
      await Promise.all([
        this.regimeService.detectRegime("BTC"),
        this.portfolioStateService.analyze(userId),
        prisma.portfolioHolding.findMany({
          where: { userId },
          orderBy: { currentValue: "desc" },
        }),
        prisma.userInvestmentProfile.findUnique({
          where: { userId },
        }),
        prisma.investmentInsight.findMany({
          where: {
            OR: [{ userId }, { userId: "global" }],
            AND: [
              { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            ],
          },
          orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
          take: 100,
        }),
      ]);

    if (!holdings.length || portfolioState.totalValue <= 0) return null;

    const maxWeight = profile?.maxSingleAssetWeight ?? 0.6;
    const holdingSymbols = holdings.map((h) => h.symbol);

    const buyZoneInsights = insights.filter((i) => i.type === "smart_buy_zone");
    const riskInsights = insights.filter((i) => i.type === "risk_alert");
    const behaviorInsights = insights.filter(
      (i) => i.type === "behavior_analysis",
    );

    const buyZoneSymbols = buyZoneInsights
      .map((i) => i.symbol)
      .filter((s): s is string => !!s);

    const symbols = Array.from(new Set([...holdingSymbols, ...buyZoneSymbols]));

    const [indicators, sentiments, assets, whaleTx] = await Promise.all([
      prisma.technicalIndicator.findMany({
        where: {
          symbol: { in: symbols },
          timeframe: Timeframe.m5,
        },
        orderBy: { timestamp: "desc" },
        distinct: ["symbol"],
      }),
      prisma.marketSentiment.findMany({
        where: {
          symbol: { in: symbols },
        },
        orderBy: { calculatedAt: "desc" },
        distinct: ["symbol"],
      }),
      prisma.marketAsset.findMany({
        where: {
          symbol: { in: symbols },
        },
        select: {
          symbol: true,
          currentPrice: true,
        },
      }),
      prisma.whaleTransaction.findMany({
        where: {
          symbol: { in: symbols },
        },
        orderBy: { detectedAt: "desc" },
        take: 100,
      }),
    ]);

    const holdingMap = new Map(holdings.map((h) => [h.symbol, h]));
    const indicatorMap = new Map(indicators.map((i) => [i.symbol, i]));
    const sentimentMap = new Map(sentiments.map((s) => [s.symbol, s]));
    const priceMap = new Map<string, number>(
      assets.map((a) => [a.symbol, Number(a.currentPrice ?? 0)]),
    );

    const whaleMap = new Map<string, WhaleFlow>();
    for (const tx of whaleTx) {
      const current = whaleMap.get(tx.symbol) ?? { buy: 0, sell: 0 };

      if (tx.transactionType === "buy") {
        current.buy += Number(tx.amountKRW ?? 0);
      } else {
        current.sell += Number(tx.amountKRW ?? 0);
      }

      whaleMap.set(tx.symbol, current);
    }

    const buyZoneMap = new Map(
      buyZoneInsights
        .filter((i) => i.symbol)
        .map((i) => [i.symbol as string, i]),
    );

    const riskMap = new Map<string, typeof riskInsights>();
    for (const risk of riskInsights) {
      const payload = (risk.payload as Record<string, any> | null) ?? null;
      const symbol = payload?.symbol ?? risk.symbol ?? "__GLOBAL__";
      const arr = riskMap.get(symbol) ?? [];
      arr.push(risk);
      riskMap.set(symbol, arr);
    }

    const symbolFeatures = new Map<string, SymbolFeature>();

    for (const symbol of symbols) {
      symbolFeatures.set(symbol, {
        symbol,
        holding: holdingMap.get(symbol),
        indicator: indicatorMap.get(symbol),
        sentiment: sentimentMap.get(symbol),
        currentPrice: priceMap.get(symbol),
        whaleFlow: whaleMap.get(symbol),
        buyZoneInsight: buyZoneMap.get(symbol),
        riskInsights: [
          ...(riskMap.get(symbol) ?? []),
          ...(riskMap.get("__GLOBAL__") ?? []),
        ],
      });
    }

    return {
      userId,
      marketRegime,
      portfolioState,
      maxWeight,
      topHolding: holdings[0],
      holdings,
      symbolFeatures,
      behaviorInsights,
      candidateSymbols: symbols,
    };
  }
}
