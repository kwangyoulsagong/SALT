import prisma from "../../config/database";

export class WhaleSignalService {
  async generateWhaleSignals() {
    const markets = await prisma.marketAsset.findMany({
      take: 50,
    });

    const symbols = markets.map((m) => m.symbol);

    // 🔥 priceHistory 한번에 가져오기
    const histories = await prisma.priceHistory.findMany({
      where: {
        symbol: { in: symbols },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // 🔥 symbol 기준으로 그룹화
    const grouped: Record<string, typeof histories> = {};

    for (const h of histories) {
      if (!grouped[h.symbol]) grouped[h.symbol] = [];
      grouped[h.symbol].push(h);
    }

    const insights = [];

    for (const market of markets) {
      const priceHistory = grouped[market.symbol]?.slice(0, 30) ?? [];

      if (priceHistory.length < 10) continue;

      const current = priceHistory[0];
      const oldest = priceHistory[priceHistory.length - 1];

      const avgVolume =
        priceHistory.reduce((sum, p) => sum + p.volume, 0) /
        priceHistory.length;

      const volumeSpike = current.volume > avgVolume * 3;

      if (!volumeSpike) continue;

      const priceChange = ((current.close - oldest.close) / oldest.close) * 100;

      let type = "";
      let title = "";
      let summary = "";

      if (priceChange > 2) {
        type = "whale_buy_signal";
        title = "고래 매수 감지";
        summary = `${market.symbol} 거래량 급증 + 가격 상승`;
      }

      if (priceChange < -2) {
        type = "whale_sell_signal";
        title = "고래 매도 감지";
        summary = `${market.symbol} 거래량 급증 + 가격 하락`;
      }

      if (!type) continue;

      // 🔥 severity 동적 계산
      const severity = Math.min(
        100,
        Math.round((current.volume / avgVolume) * 20),
      );

      const insight = await prisma.investmentInsight.upsert({
        where: {
          userId_type_dedupeKey: {
            userId: "global",
            type,
            dedupeKey: `whale:${market.symbol}`,
          },
        },

        create: {
          userId: "global",
          symbol: market.symbol,
          assetType: "crypto",
          type,
          title,
          summary,
          severity,
          confidence: 0.8,
          payload: {
            volume: current.volume,
            avgVolume,
            priceChange,
          },
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },

        update: {
          summary,
          severity,
          payload: {
            volume: current.volume,
            avgVolume,
            priceChange,
          },
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      insights.push(insight);
    }

    return insights;
  }
}
