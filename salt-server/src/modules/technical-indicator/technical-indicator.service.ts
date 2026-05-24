import prisma from "../../config/database";
import { Timeframe } from "@prisma/client";

export class TechnicalIndicatorService {
  async calculateIndicators(symbol: string, timeframe: Timeframe) {
    const candles = await prisma.priceHistory.findMany({
      where: { symbol, timeframe },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    if (candles.length < 50) return;

    const closes = candles.map((c) => Number(c.close)).reverse();
    const volumes = candles.map((c) => Number(c.volume ?? 0)).reverse();

    const rsi = this.calculateRSI(closes, 14);
    const ma20 = this.calculateMA(closes, 20);
    const ma50 = this.calculateMA(closes, 50);
    const volumeAvg20 = this.calculateMA(volumes, 20);

    const latest = candles[0];

    await prisma.technicalIndicator.upsert({
      where: {
        symbol_timeframe_timestamp: {
          symbol,
          timeframe,
          timestamp: latest.timestamp,
        },
      },
      create: {
        symbol,
        timeframe,
        assetType: latest.assetType,
        timestamp: latest.timestamp,
        rsi14: rsi,
        ma20,
        ma50,
        volumeAvg20,
      },
      update: {
        rsi14: rsi,
        ma20,
        ma50,
        volumeAvg20,
      },
    });
  }

  private calculateMA(values: number[], period: number) {
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateRSI(values: number[], period: number) {
    let gains = 0;
    let losses = 0;

    for (let i = values.length - period; i < values.length; i++) {
      const diff = values[i] - values[i - 1];

      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    const rs = gains / (losses || 1);
    return 100 - 100 / (1 + rs);
  }
}
