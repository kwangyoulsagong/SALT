import type { InsightType, Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";

/**
 * `PriceHistory.close`·`volume` 은 스키마상 `Decimal` 이고 `volume` 은 nullable 이다.
 * `number` 로 바로 산술하면 타입이 깨지고, 값이 있어도 `Decimal` 객체라 `+` 가 문자열 연결이 된다.
 * **읽는 지점에서 한 번만** 숫자로 내린다.
 */
const toNumber = (value: { toString(): string } | null | undefined): number =>
  value == null ? 0 : Number(value.toString());

/** 거래량 급증을 볼 최근 봉 수 */
const WHALE_BARS = 30;

export class WhaleSignalService {
  async generateWhaleSignals() {
    const markets = await prisma.marketAsset.findMany({
      take: 50,
    });

    const symbols = markets.map((m) => m.symbol);

    // 심볼마다 최신 30봉(시간 단위 무관) — 단위마다 인덱스 `(symbol, timeframe, timestamp)` 로 30행씩 집고 합쳐 30행.
    // 예전엔 50심볼의 **봉 전체**를 Node 로 옮겨 30행만 썼다(부팅 때 1초+ — 재기동 직후 판단 상세 504, 2026-11-09 DB-REQ-017)
    const histories = await prisma.$queryRaw<
      Array<{ symbol: string; timestamp: Date; close: Prisma.Decimal; volume: Prisma.Decimal | null }>
    >`
      SELECT symbol, timestamp, close, volume FROM (
        SELECT s.symbol, b.timestamp, b.close, b.volume,
               row_number() OVER (PARTITION BY s.symbol ORDER BY b.timestamp DESC, f.ord) AS rn
        FROM unnest(${symbols}::text[]) AS s(symbol)
        -- 봉 단위 전부 — 시장 PriceTimeframe 과 같은 값(단위가 늘면 같이 — PrismaPriceHistoryRepository 가 컴파일로 알린다)
        CROSS JOIN unnest(${["5m", "15m", "1h", "1d"]}::text[]) WITH ORDINALITY AS f(timeframe, ord)
        CROSS JOIN LATERAL (
          SELECT p.timestamp, p.close, p.volume FROM price_history p
          WHERE p.symbol = s.symbol AND p.timeframe = f.timeframe
          ORDER BY p.timestamp DESC
          LIMIT ${WHALE_BARS}
        ) b
      ) x
      WHERE rn <= ${WHALE_BARS}
      ORDER BY symbol, rn`;

    // 🔥 symbol 기준으로 그룹화
    const grouped: Record<string, typeof histories> = {};

    for (const h of histories) {
      if (!grouped[h.symbol]) grouped[h.symbol] = [];
      grouped[h.symbol].push(h);
    }

    const insights = [];

    for (const market of markets) {
      const priceHistory = grouped[market.symbol]?.slice(0, WHALE_BARS) ?? [];

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
