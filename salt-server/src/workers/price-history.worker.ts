// workers/price-history.worker.ts

import cron from "node-cron";
import prisma from "../config/database";
import {
  UpbitService,
  PriceTimeframe,
} from "../modules/investment/upbit.service";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PriceHistoryWorker {
  private upbit = new UpbitService();
  private running = false;

  // 저장할 타임프레임/개수 (필요시 조정)
  private targets: Array<{ timeframe: PriceTimeframe; count: number }> = [
    { timeframe: "5m", count: 288 }, // 5분봉 1일=288개, 일단 1~7일치 정도로
    { timeframe: "1d", count: 120 }, // 일봉 120일
  ];

  start() {
    console.log("🚀 PriceHistory Worker started");

    // 서버 시작 시 1회
    this.run();

    // 5분마다 갱신 (5m 캔들 기준)
    cron.schedule("*/5 * * * *", () => this.run());
  }

  private async run() {
    if (this.running) return;
    this.running = true;

    try {
      console.log("📈 PriceHistory collecting...");

      const symbols = await prisma.marketAsset.findMany({
        where: { isActive: true, assetType: "crypto" },
        select: { symbol: true },
      });

      const symbolList = symbols.map((s) => s.symbol).filter(Boolean);

      // 🔥 업비트 레이트리밋 고려: 10개씩 배치 처리 추천
      const BATCH_SIZE = 10;

      for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
        const batch = symbolList.slice(i, i + BATCH_SIZE);

        // 심볼 배치 병렬 처리
        await Promise.all(batch.map((symbol) => this.collectSymbol(symbol)));

        // 짧게 쉬기 (업비트 보호)
        await sleep(150);
      }

      // (선택) 오래된 데이터 정리
      await this.cleanup();

      console.log("✅ PriceHistory collection done");
    } catch (e) {
      console.error("PriceHistory worker error:", e);
    } finally {
      this.running = false;
    }
  }

  private async collectSymbol(symbol: string) {
    for (const t of this.targets) {
      await this.collectCandles(symbol, t.timeframe, t.count);
      await sleep(50); // 심볼 내 timeframe 간도 살짝 쉬기
    }
  }

  private async collectCandles(
    symbol: string,
    timeframe: PriceTimeframe,
    count: number,
  ) {
    // Upbit 캔들 조회
    const candles = await this.upbit.getCandlesByTimeframe(
      symbol,
      timeframe,
      count,
    );

    // UpbitService가 지금 반환하는 형태:
    // day: { date, open, high, low, close, volume }
    // minute: { timestamp, open, high, low, close, volume }
    // => timestamp 통일 처리
    const rows = candles
      .map((c: any) => {
        const ts = c.timestamp ?? c.date; // minute는 timestamp, day는 date
        if (!ts) return null;

        // 업비트가 candle_date_time_kst(문자열) 주는 경우도 있어서 Date로 변환
        const timestamp =
          typeof ts === "string" ? new Date(ts + "+09:00") : new Date(ts);

        return {
          symbol: symbol.toUpperCase(),
          assetType: "crypto" as const,
          timeframe,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume ?? null,
          timestamp,
        };
      })
      .filter(Boolean) as any[];

    if (rows.length === 0) return;

    // 🔥 핵심: unique(symbol,timeframe,timestamp) 기반 upsert
    // Prisma upsert는 단건이라, 여기서는 Promise.all로 처리 (배치 크기 주의)
    // rows가 너무 크면 또 batched로 나누기
    const UPSERT_BATCH = 100;
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const chunk = rows.slice(i, i + UPSERT_BATCH);

      await Promise.all(
        chunk.map((r) =>
          prisma.priceHistory.upsert({
            where: {
              symbol_timeframe_timestamp: {
                symbol: r.symbol,
                timeframe: r.timeframe,
                timestamp: r.timestamp,
              },
            },
            update: {
              open: r.open,
              high: r.high,
              low: r.low,
              close: r.close,
              volume: r.volume,
            },
            create: r,
          }),
        ),
      );
    }
  }

  /**
   * 보관 정책 (예시)
   * - 5m: 최근 30일만 유지
   * - 1d: 최근 2년 유지
   */
  private async cleanup() {
    await prisma.$executeRaw`
    DELETE FROM price_history
    WHERE timeframe = '5m'
    AND timestamp < NOW() - INTERVAL '30 days'
  `;

    await prisma.$executeRaw`
    DELETE FROM price_history
    WHERE timeframe = '1d'
    AND timestamp < NOW() - INTERVAL '2 years'
  `;
  }
}
