import prisma from "../../shared/infrastructure/prisma";

export class PortfolioRebalanceService {
  async generateRebalance(userId: string) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (holdings.length === 0) return [];

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.currentValue ?? 0),
      0,
    );

    const recommendations = [];

    for (const holding of holdings) {
      const weight = (holding.currentValue ?? 0) / totalValue;

      // 목표 비중
      const targetWeight = 0.25;

      const diff = weight - targetWeight;

      if (Math.abs(diff) < 0.05) continue;

      const action = diff > 0 ? "reduce" : "increase";

      // 경합에 오류가 안 나게(`prisma-database.md` "데이터 안전") — Prisma `upsert` 는 조회 → 생성 두 단계라 같은 사람의 회차가
      // 겹치면 P2002 였다(2026-11-12 서버 로그 374회). 없으면 넣기(ON CONFLICT DO NOTHING) → 갱신 → 읽기
      const key = { userId, type: "rebalance" as const, dedupeKey: `rebalance:${holding.symbol}` };
      const payload = { symbol: holding.symbol, currentWeight: weight, targetWeight, action };
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
      await prisma.investmentInsight.createMany({
        data: [
          {
            ...key,
            symbol: holding.symbol,
            assetType: holding.assetType,
            title: "포트폴리오 리밸런싱 추천",
            summary: `${holding.symbol} 비중 조정 추천`,
            severity: 50,
            confidence: 0.75,
            payload,
            expiresAt,
          },
        ],
        skipDuplicates: true,
      });
      await prisma.investmentInsight.updateMany({ where: key, data: { payload, expiresAt } });
      const insight = await prisma.investmentInsight.findUniqueOrThrow({ where: { userId_type_dedupeKey: key } });

      recommendations.push(insight);
    }

    return recommendations;
  }
}
