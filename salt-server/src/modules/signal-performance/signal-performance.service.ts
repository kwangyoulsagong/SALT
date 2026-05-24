import prisma from "../../config/database";
import type { SignalPerformanceQueryDto } from "./signal-performance.dto";

export class SignalPerformanceService {
  async get(userId: string, query: SignalPerformanceQueryDto) {
    const where: any = {
      userId,
      type: "ai_coach",
    };
    if (query.symbol) where.symbol = query.symbol.toUpperCase();

    const insights = await prisma.investmentInsight.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const samples = [];

    for (const insight of insights) {
      const payload = (insight.payload as Record<string, any> | null) ?? {};
      if (payload.kind === "coach_feedback") continue;

      const symbol =
        insight.symbol ??
        payload.symbol ??
        payload.recommendation?.symbol ??
        query.symbol?.toUpperCase();
      if (!symbol) continue;

      const [entry, latest] = await Promise.all([
        prisma.priceHistory.findFirst({
          where: {
            symbol,
            timestamp: { gte: insight.createdAt },
          },
          orderBy: { timestamp: "asc" },
        }),
        prisma.priceHistory.findFirst({
          where: { symbol },
          orderBy: { timestamp: "desc" },
        }),
      ]);

      if (!entry || !latest) continue;

      const entryPrice = Number(entry.close);
      const latestPrice = Number(latest.close);
      if (!entryPrice) continue;

      const returnRate = (latestPrice - entryPrice) / entryPrice;
      samples.push({
        insightId: insight.id,
        symbol,
        signalKey: query.signalKey ?? payload.mode ?? payload.recommendation?.action ?? "ai_coach",
        createdAt: insight.createdAt,
        entryPrice,
        latestPrice,
        returnRate,
        win: returnRate > 0,
      });
    }

    const sampleCount = samples.length;
    const wins = samples.filter((sample) => sample.win).length;
    const avgReturn =
      sampleCount > 0
        ? samples.reduce((sum, sample) => sum + sample.returnRate, 0) / sampleCount
        : null;
    const maxDrawdown =
      sampleCount > 0
        ? Math.min(...samples.map((sample) => sample.returnRate))
        : null;

    return {
      status: sampleCount ? "active" : "insufficient_data",
      sampleCount,
      winRate: sampleCount ? wins / sampleCount : null,
      avgReturn,
      maxDrawdown,
      samples: samples.slice(0, 20),
      generatedAt: new Date().toISOString(),
    };
  }
}
