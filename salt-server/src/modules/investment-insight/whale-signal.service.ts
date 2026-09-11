import type { InsightType } from "@prisma/client";

import prisma from "../../config/database";

/**
 * `PriceHistory.close`·`volume` 은 스키마상 `Decimal` 이고 `volume` 은 nullable 이다.
 * `number` 로 바로 산술하면 타입이 깨지고, 값이 있어도 `Decimal` 객체라 `+` 가 문자열 연결이 된다.
 * **읽는 지점에서 한 번만** 숫자로 내린다.
 */
const toNumber = (value: { toString(): string } | null | undefined): number =>
  value == null ? 0 : Number(value.toString());

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

      const currentVolume = toNumber(current.volume);
      const avgVolume =
        priceHistory.reduce((sum, p) => sum + toNumber(p.volume), 0) /
        priceHistory.length;

      const volumeSpike = currentVolume > avgVolume * 3;

      if (!volumeSpike) continue;

      const currentClose = toNumber(current.close);
      const oldestClose = toNumber(oldest.close);
      if (!oldestClose) continue;

      const priceChange = ((currentClose - oldestClose) / oldestClose) * 100;

      let type: InsightType | "" = "";
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
      const severity = avgVolume
        ? Math.min(100, Math.round((currentVolume / avgVolume) * 20))
        : 0;

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
            volume: currentVolume,
            avgVolume,
            priceChange,
          },
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },

        update: {
          summary,
          severity,
          payload: {
            volume: currentVolume,
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
