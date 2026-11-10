import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  Candle,
  ClosePercentiles,
  DailyReturnProfile,
  OvernightGapStats,
  ClosePoint,
  MarketAssetType,
  PeriodBaseline,
  PriceHistoryRepository,
  PriceTimeframe,
} from "../domain";

/** upsert 배치 크기. 원문 워커 상수다. */
const UPSERT_BATCH = 100;

/** 봉 시간 단위 전부와 순서(짧은 것부터) — `Record` 라 도메인 `PriceTimeframe` 에 단위가 늘면 여기서 컴파일이 깨진다 */
const PRICE_TIMEFRAME_ORDER: Record<PriceTimeframe, number> = { "5m": 0, "15m": 1, "1h": 2, "1d": 3 };
const PRICE_TIMEFRAMES = (Object.keys(PRICE_TIMEFRAME_ORDER) as PriceTimeframe[]).sort(
  (a, b) => PRICE_TIMEFRAME_ORDER[a] - PRICE_TIMEFRAME_ORDER[b]
);

export class PrismaPriceHistoryRepository implements PriceHistoryRepository {
  /**
   * 캔들 저장 — `(symbol, timeframe, timestamp)` 유니크 위에서 **한 문장** `INSERT … ON CONFLICT DO UPDATE`(묶음마다 연결 하나).
   * 워커가 겹쳐 돌아도 행이 늘지 않는다(멱등). 전에는 단건 upsert 100개를 `Promise.all` 로 흩어 연결 풀을 다 잡았다
   * (`applyQuotes` 와 같은 원인, 2026-11-10). 꼴은 국내 일봉 `PrismaKrStockStore.upsertDailyCandles` 와 같다
   */
  async upsertCandles(
    symbol: string,
    assetType: MarketAssetType,
    timeframe: PriceTimeframe,
    candles: Candle[]
  ) {
    for (let i = 0; i < candles.length; i += UPSERT_BATCH) {
      const chunk = candles.slice(i, i + UPSERT_BATCH);
      const col = <T,>(pick: (c: Candle) => T) => chunk.map(pick);
      await prisma.$executeRaw`
        INSERT INTO price_history (id, symbol, asset_type, timeframe, open, high, low, close, volume, timestamp)
        SELECT gen_random_uuid()::text, ${symbol}, ${assetType}::"AssetType", ${timeframe}, u.open, u.high, u.low, u.close, u.volume,
          u.ts AT TIME ZONE 'UTC'
        FROM unnest(
          ${col((c) => c.open)}::numeric[], ${col((c) => c.high)}::numeric[], ${col((c) => c.low)}::numeric[],
          ${col((c) => c.close)}::numeric[], ${col((c) => c.volume)}::numeric[], ${col((c) => c.timestamp)}::timestamptz[]
        ) AS u(open, high, low, close, volume, ts)
        ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET
          open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume
        -- 값이 같으면 쓰지 않는다 — 창 전체를 다시 받아도 바뀐 봉(마지막 몇 개)만 쓴다(장중 504, 2026-11-10 DB-REQ-017)
        WHERE (price_history.open, price_history.high, price_history.low, price_history.close, price_history.volume)
          IS DISTINCT FROM (EXCLUDED.open, EXCLUDED.high, EXCLUDED.low, EXCLUDED.close, EXCLUDED.volume)`;
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

  async highestCloseBetween(symbol: string, from: Date, to: Date): Promise<number | null> {
    const row = await prisma.priceHistory.aggregate({
      where: { symbol, timeframe: "5m", timestamp: { gte: from, lte: to } },
      _max: { close: true },
    });
    return row._max.close === null ? null : Number(row._max.close);
  }

  /** `at` 이후 첫 종가 — 한 주기 안에서만 고른다(`(symbol, timeframe, timestamp)` 인덱스). */
  async closeAtOrAfter(
    symbol: string,
    at: Date,
    timeframe: PriceTimeframe
  ): Promise<number | null> {
    const row = await prisma.priceHistory.findFirst({
      where: { symbol, timeframe, timestamp: { gte: at } },
      orderBy: { timestamp: "asc" },
      select: { close: true },
    });

    return row ? Number(row.close) : null;
  }

  async closeAtOrBefore(
    symbol: string,
    at: Date,
    timeframe: PriceTimeframe,
    notBefore: Date
  ): Promise<{ close: number; timestamp: Date } | null> {
    const row = await prisma.priceHistory.findFirst({
      where: { symbol, timeframe, timestamp: { lte: at, gte: notBefore } },
      orderBy: { timestamp: "desc" },
      select: { close: true, timestamp: true },
    });

    return row ? { close: Number(row.close), timestamp: row.timestamp } : null;
  }

  /** `groupBy` 한 번 — `(symbol, timeframe, timestamp)` 유니크 인덱스가 덮는다 */
  async candleCounts(symbols: string[], timeframe: PriceTimeframe): Promise<Map<string, number>> {
    if (symbols.length === 0) return new Map();
    const rows = await prisma.priceHistory.groupBy({
      by: ["symbol"],
      where: { symbol: { in: symbols }, timeframe },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.symbol, row._count._all]));
  }

  /**
   * 심볼마다 가장 늦은 봉의 종가(시간 단위 무관). 단위마다 인덱스 `(symbol, timeframe, timestamp)` 로 최신 한 행을 집고 그중 늦은 것 —
   * 예전 Prisma `distinct` 는 심볼들의 **봉 전체**를 Node 로 옮겨 메모리에서 걸렀다(코인 117종목 1.8초 · 국내 56종목 0.9초 — 부팅 때
   * 판단 상세 504, 2026-11-09). 같은 시각 여러 단위면 짧은 단위(그 시각 마지막 값)
   */
  async latestCloses(symbols: string[]): Promise<ClosePoint[]> {
    if (symbols.length === 0) return [];

    const rows = await prisma.$queryRaw<Array<{ symbol: string; close: Prisma.Decimal; timestamp: Date }>>`
      SELECT DISTINCT ON (s.symbol) s.symbol, b.close, b.timestamp
      FROM unnest(${[...new Set(symbols)]}::text[]) AS s(symbol)
      CROSS JOIN unnest(${[...PRICE_TIMEFRAMES]}::text[]) WITH ORDINALITY AS f(timeframe, ord)
      CROSS JOIN LATERAL (
        SELECT p.close, p.timestamp FROM price_history p
        WHERE p.symbol = s.symbol AND p.timeframe = f.timeframe
        ORDER BY p.timestamp DESC
        LIMIT 1
      ) b
      ORDER BY s.symbol, b.timestamp DESC, f.ord`;

    return rows.map((row) => ({
      symbol: row.symbol,
      close: Number(row.close),
      timestamp: row.timestamp,
    }));
  }

  /**
   * 종가 백분위 — `percentile_cont` 로 DB 가 보간한다.
   *
   * `close` 는 `Decimal` 이고 `percentile_cont` 는 `double precision` 을 받아서 캐스팅한다.
   * 백분위는 표시용 관찰 구간이라 이 정밀도로 충분하다 — 원장 금액이 아니다.
   * `(symbol, timeframe, timestamp)` 인덱스를 탄다.
   */
  async closePercentiles(
    symbol: string,
    timeframe: PriceTimeframe,
    since: Date,
    fractions: number[]
  ): Promise<ClosePercentiles> {
    const [row] = await prisma.$queryRaw<
      Array<{ sample: number; values: number[] | null }>
    >`
      SELECT COUNT(*)::int AS sample,
             percentile_cont(${fractions}::float8[])
               WITHIN GROUP (ORDER BY close::float8) AS values
      FROM price_history
      WHERE symbol = ${symbol}
        AND timeframe = ${timeframe}
        -- TIMESTAMP 열(UTC 벽시계)과 비교하려면 파라미터도 UTC 벽시계로 — 그냥 비교하면 세션 시간대(KST)로 해석돼 9시간 어긋난다
        AND timestamp >= (${since}::timestamptz AT TIME ZONE 'UTC')
    `;

    return { sample: row?.sample ?? 0, values: row?.values ?? null };
  }

  /**
   * 밤사이 갭 분포 — `LAG` 로 전 봉 종가를 붙이고 `percentile_cont` · `MIN` 을 DB 가 한다. 한 심볼 5년 일봉 약 1,200행,
   * `(symbol, timeframe, timestamp)` 인덱스를 탄다. 시가 0 · 전 봉 없음은 표본이 아니고, `bounds` 밖 비율은 `excluded` 로만 센다.
   * 창 첫 봉은 창 밖 전 봉과 잇지 않는다(전 봉이 없는 것으로) — 표본 하나를 잃고 경계 조회를 하나 줄인다
   */
  async overnightGapStats(
    symbol: string,
    timeframe: PriceTimeframe,
    since: Date,
    fraction: number,
    bounds: { min: number; max: number }
  ): Promise<OvernightGapStats> {
    const [row] = await prisma.$queryRaw<
      Array<{ sample: number; excluded: number; quantile: number | null; worst: number | null }>
    >`
      WITH bars AS (
        SELECT open::float8 / NULLIF(LAG(close::float8) OVER (ORDER BY timestamp), 0) AS ratio
        FROM price_history
        WHERE symbol = ${symbol}
          AND timeframe = ${timeframe}
          -- TIMESTAMP 열(UTC 벽시계) — 파라미터도 UTC 벽시계로(세션 시간대 KST 로 읽으면 9시간 어긋난다)
          AND timestamp >= (${since}::timestamptz AT TIME ZONE 'UTC')
          AND open > 0
      ), kept AS (
        SELECT ratio - 1 AS gap FROM bars WHERE ratio BETWEEN ${bounds.min}::float8 AND ${bounds.max}::float8
      )
      SELECT (SELECT COUNT(*)::int FROM kept) AS sample,
             (SELECT COUNT(*)::int FROM bars WHERE ratio IS NOT NULL AND ratio NOT BETWEEN ${bounds.min}::float8 AND ${bounds.max}::float8) AS excluded,
             (SELECT percentile_cont(${fraction}::float8) WITHIN GROUP (ORDER BY gap) FROM kept) AS quantile,
             (SELECT MIN(gap) FROM kept) AS worst
    `;

    return {
      sample: row?.sample ?? 0,
      excluded: row?.excluded ?? 0,
      quantile: row?.quantile ?? null,
      worst: row?.worst ?? null,
    };
  }

  /**
   * 국내 주식 전 종목 구간 수익률 요약 — `LAG` 로 전 봉을 붙이고 집계를 DB 가 한다. 6개월이면 약 2,600종목 × 125행
   * (실측 0.5초, 순차 스캔 — `asset_type` 인덱스가 없다. 결과는 구간이 지나면 바뀌지 않아 코치 어댑터가 캐시한다).
   * 구간 첫 봉은 구간 밖 전 봉과 잇지 않는다. 왜도 = (E[x³] − 3μE[x²] + 2μ³) ÷ σ³(모집단)
   */
  async krDailyReturnProfiles(
    from: Date,
    to: Date,
    minReturns: number,
    bounds: { min: number; max: number }
  ): Promise<DailyReturnProfile[]> {
    const rows = await prisma.$queryRaw<
      Array<{ symbol: string; last_close: number; returns: number; volatility: number | null; skewness: number | null }>
    >`
      WITH bars AS (
        SELECT symbol, timestamp, close::float8 AS close,
               close::float8 / NULLIF(LAG(close::float8) OVER (PARTITION BY symbol ORDER BY timestamp), 0) AS ratio
        FROM price_history
        WHERE asset_type = 'kr_stock'
          AND timeframe = '1d'
          -- TIMESTAMP 열(UTC 벽시계) — 파라미터도 UTC 벽시계로
          AND timestamp >= (${from}::timestamptz AT TIME ZONE 'UTC')
          AND timestamp < (${to}::timestamptz AT TIME ZONE 'UTC')
      ), kept AS (
        SELECT symbol, timestamp, close,
               CASE WHEN ratio BETWEEN ${bounds.min}::float8 AND ${bounds.max}::float8 THEN ln(ratio) END AS r
        FROM bars
      ), stats AS (
        SELECT symbol,
               (array_agg(close ORDER BY timestamp DESC))[1] AS last_close,
               COUNT(r)::int AS returns,
               stddev_samp(r) AS volatility,
               stddev_pop(r) AS sd,
               avg(r) AS m1, avg(r * r) AS m2, avg(r * r * r) AS m3
        FROM kept
        GROUP BY symbol
      )
      SELECT symbol, last_close, returns, volatility,
             CASE WHEN sd > 0 THEN (m3 - 3 * m1 * m2 + 2 * m1 * m1 * m1) / (sd * sd * sd) END AS skewness
      FROM stats
      WHERE returns >= ${minReturns}
      ORDER BY symbol
    `;
    return rows.map((row) => ({
      symbol: row.symbol,
      lastClose: row.last_close,
      returns: row.returns,
      volatility: row.volatility,
      skewness: row.skewness,
    }));
  }

  /**
   * 구간이 좁아서(일봉 3일 · 5분봉 30분) 심볼당 몇 행이다. 최신이 앞이게 읽고 심볼별
   * 첫 행만 남긴다 — `distinct` 를 쓰지 않는 이유는 Prisma 가 그것을 메모리에서 하기
   * 때문이고, 결과는 같다. `(symbol, timeframe, timestamp)` 인덱스를 탄다.
   */
  async baselineCloses(symbols: string[], baseline: PeriodBaseline) {
    const closes = new Map<string, number>();
    if (symbols.length === 0) return closes;

    const rows = await prisma.priceHistory.findMany({
      where: {
        symbol: { in: symbols },
        timeframe: baseline.timeframe,
        timestamp: {
          gte: baseline.candleStartNotBefore,
          lte: baseline.candleStartAtOrBefore,
        },
      },
      orderBy: { timestamp: "desc" },
      select: { symbol: true, close: true },
    });

    for (const row of rows) {
      if (!closes.has(row.symbol)) closes.set(row.symbol, Number(row.close));
    }
    return closes;
  }

  async earliestCandleStarts(timeframe: PriceTimeframe) {
    const rows = await prisma.priceHistory.groupBy({
      by: ["symbol"],
      where: { timeframe },
      _min: { timestamp: true },
    });

    const starts = new Map<string, Date>();
    for (const row of rows) {
      if (row._min.timestamp) starts.set(row.symbol, row._min.timestamp);
    }
    return starts;
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

  /**
   * 최근 봉 `take` 개(최신이 앞) — 지표 계산 입력. 값은 DB 가 `float8` 로 내려 준다(`numeric` → 가장 가까운 double — `Number(Decimal)` 과 같은 값,
   * 전 종목 대조). 예전엔 Prisma 행 전체(Decimal 객체 다섯 · uuid)를 읽어 2분마다 49만 행을 해석했다 — API 프로세스가 몇 초씩 막혀
   * 판단 상세가 504(2026-11-09 `DB-REQ-017`)
   */
  async recentCandles(symbol: string, timeframe: string, take: number) {
    const rows = await prisma.$queryRaw<
      Array<{ open: number; high: number; low: number; close: number; volume: number | null; timestamp: Date; asset_type: string }>
    >`
      SELECT open::float8 AS open, high::float8 AS high, low::float8 AS low, close::float8 AS close, volume::float8 AS volume,
             timestamp, asset_type::text AS asset_type
      FROM price_history
      WHERE symbol = ${symbol} AND timeframe = ${timeframe}
      ORDER BY timestamp DESC
      LIMIT ${take}`;

    return rows.map((row) => ({
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      timestamp: row.timestamp,
      assetType: row.asset_type as MarketAssetType,
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
    retention: Array<{ timeframe: string; interval: string; exceptAssetType?: MarketAssetType }>
  ) {
    for (const rule of retention) {
      const except = rule.exceptAssetType ?? null;
      await prisma.$executeRaw`
        DELETE FROM price_history
        WHERE timeframe = ${rule.timeframe}
          AND (${except}::text IS NULL OR asset_type::text <> ${except}::text)
          -- NOW() 는 timestamptz — TIMESTAMP 열(UTC 벽시계)과 그냥 비교하면 세션 시간대(KST)로 해석돼 9시간 일찍 지운다
          AND timestamp < (NOW() AT TIME ZONE 'UTC') - ${rule.interval}::interval
      `;
    }
  }
}
