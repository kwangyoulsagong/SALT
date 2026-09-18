import prisma from "../../shared/infrastructure/prisma";
import type {
  Candle,
  ClosePoint,
  MarketAssetType,
  PriceHistoryRepository,
  PriceTimeframe,
} from "../domain";

/** upsert 배치 크기. 원문 워커 상수다. */
const UPSERT_BATCH = 100;

export class PrismaPriceHistoryRepository implements PriceHistoryRepository {
  /**
   * 캔들 저장.
   *
   * `(symbol, timeframe, timestamp)` 유니크 위에서 upsert 한다 — **워커가 겹쳐 돌아도
   * 행이 늘지 않는다**(멱등). Prisma 의 upsert 는 단건이라 배치로 나눠 병렬 처리한다.
   */
  async upsertCandles(
    symbol: string,
    assetType: MarketAssetType,
    timeframe: PriceTimeframe,
    candles: Candle[]
  ) {
    if (candles.length === 0) return;

    for (let i = 0; i < candles.length; i += UPSERT_BATCH) {
      const chunk = candles.slice(i, i + UPSERT_BATCH);

      await Promise.all(
        chunk.map((candle) =>
          prisma.priceHistory.upsert({
            where: {
              symbol_timeframe_timestamp: {
                symbol,
                timeframe,
                timestamp: candle.timestamp,
              },
            },
            update: {
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
            },
            create: {
              symbol,
              assetType,
              timeframe,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
              timestamp: candle.timestamp,
            },
          })
        )
      );
    }
  }

  /**
   * 여러 심볼의 종가를 한 번에.
   *
   * `close` 는 `Decimal` 이다. **여기서 `Number` 로 내린다** — 원문에서는 이 변환이
   * 호출처마다 있었고, 한 곳(`whale-signal`)에서 빠져 `+` 가 문자열 연결이 될 뻔했다
   * (`SRV-REQ-006` 체크리스트 §6). 경계에서 한 번 바꾸면 그 실수가 성립하지 않는다.
   */
  /**
   * `since` 이후 5분봉 최고 종가.
   *
   * `groupBy` 로 DB 가 집계한다 — 48시간이면 심볼당 576행이고, 그걸 옮겨 와서
   * `Math.max` 하면 행 수만큼 메모리를 쓴다. 원문(`behavior-analysis`)도 심볼마다
   * `aggregate` 를 불렀고(심볼 수만큼 왕복) 여기서 **한 번**으로 줄였다.
   */
  async highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Array<{ symbol: string; close: number }>> {
    if (symbols.length === 0) return [];

    const rows = await prisma.priceHistory.groupBy({
      by: ["symbol"],
      where: {
        symbol: { in: symbols },
        timeframe: "5m",
        timestamp: { gt: since },
      },
      _max: { close: true },
    });

    return rows
      .filter((row) => row._max.close !== null)
      .map((row) => ({ symbol: row.symbol, close: Number(row._max.close) }));
  }

  /** `at` 이후 첫 종가. 성적표가 판단 시점의 진입가로 쓴다. */
  async closeAtOrAfter(symbol: string, at: Date): Promise<number | null> {
    const row = await prisma.priceHistory.findFirst({
      where: { symbol, timestamp: { gte: at } },
      orderBy: { timestamp: "asc" },
      select: { close: true },
    });

    return row ? Number(row.close) : null;
  }

  async latestCloses(symbols: string[]): Promise<ClosePoint[]> {
    if (symbols.length === 0) return [];

    const rows = await prisma.priceHistory.findMany({
      where: { symbol: { in: symbols } },
      orderBy: { timestamp: "desc" },
      distinct: ["symbol"],
      select: { symbol: true, close: true, timestamp: true },
    });

    return rows.map((row) => ({
      symbol: row.symbol,
      close: Number(row.close),
      timestamp: row.timestamp,
    }));
  }

  async closesSince(symbols: string[], since: Date): Promise<ClosePoint[]> {
    if (symbols.length === 0) return [];

    const rows = await prisma.priceHistory.findMany({
      where: { symbol: { in: symbols }, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
      select: { symbol: true, close: true, timestamp: true },
    });

    return rows.map((row) => ({
      symbol: row.symbol,
      close: Number(row.close),
      timestamp: row.timestamp,
    }));
  }

  async recentCandles(symbol: string, timeframe: string, take: number) {
    const rows = await prisma.priceHistory.findMany({
      where: { symbol, timeframe },
      orderBy: { timestamp: "desc" },
      take,
    });

    return rows.map((row) => ({
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume === null ? null : Number(row.volume),
      timestamp: row.timestamp,
      assetType: row.assetType as MarketAssetType,
    }));
  }

  /**
   * 보관 기간이 지난 캔들 삭제.
   *
   * `$executeRaw` 를 쓰는 이유는 `NOW() - INTERVAL` 을 DB 시간 기준으로 계산하기
   * 위해서다(원문 동일). `interval` 은 **호출처가 주는 리터럴이고 사용자 입력이 아니다** —
   * 그래도 Prisma 의 파라미터 바인딩을 거치도록 `::interval` 캐스팅으로 넘긴다.
   */
  async purgeOlderThan(
    retention: Array<{ timeframe: string; interval: string }>
  ) {
    for (const rule of retention) {
      await prisma.$executeRaw`
        DELETE FROM price_history
        WHERE timeframe = ${rule.timeframe}
          AND timestamp < NOW() - ${rule.interval}::interval
      `;
    }
  }
}
