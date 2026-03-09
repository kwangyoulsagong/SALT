import prisma from "../../config/database";

export class InsightRankingService {
  async getTopInsights(userId: string) {
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
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const scored = insights.map((i) => {
      const severity = i.severity ?? 50;
      const confidence = i.confidence ?? 0.5;

      let typeWeight = 1;

      switch (i.type) {
        case "risk_alert":
          typeWeight = 1.4;
          break;

        case "smart_buy_zone":
          typeWeight = 1.3;
          break;

        case "ai_coach":
          typeWeight = 1.2;
          break;

        case "behavior_analysis":
          typeWeight = 1.1;
          break;
      }

      const ageHours = (Date.now() - new Date(i.createdAt).getTime()) / 3600000;

      const freshness = Math.max(0.5, 1 - ageHours / 24);

      const score = severity * confidence * typeWeight * freshness;

      return {
        ...i,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5);
  }
}
