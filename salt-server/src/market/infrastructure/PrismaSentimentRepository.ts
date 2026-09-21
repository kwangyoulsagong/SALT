import prisma from "../../shared/infrastructure/prisma";
import {
  SentimentLabel,
  type SentimentForwardReturn,
  type SentimentForwardReturnQuery,
  type SentimentRecord,
  type SentimentRepository,
  type StoredSentiment,
} from "../domain";

/**
 * `sentimentLabel` 은 DB 에서 자유 문자열(`String`)이다. 읽을 때 도메인 enum 으로
 * 좁히고, 모르는 값이면 `Neutral` 로 둔다 — 과거 행이나 손으로 넣은 값이 타입을
 * 깨지 않게 한다. (컬럼 승격은 `DB-REQ-*` 의 일이다.)
 */
const toLabel = (value: string): SentimentLabel =>
  (Object.values(SentimentLabel) as string[]).includes(value)
    ? (value as SentimentLabel)
    : SentimentLabel.Neutral;

export class PrismaSentimentRepository implements SentimentRepository {
  async save(record: SentimentRecord): Promise<StoredSentiment> {
    const row = await prisma.marketSentiment.create({
      data: {
        symbol: record.symbol,
        sentimentScore: record.sentimentScore,
        fearGreedIndex: record.fearGreedIndex,
        volatility: record.volatility,
        volume24h: record.volume24h,
        priceChange24h: record.priceChange24h,
        sentimentLabel: record.sentimentLabel,
      },
    });

    return { ...row, fearGreedIndex: row.fearGreedIndex ?? undefined, sentimentLabel: toLabel(row.sentimentLabel) };
  }

  async findLatestMany(symbols: string[]): Promise<StoredSentiment[]> {
    if (symbols.length === 0) return [];

    const rows = await prisma.marketSentiment.findMany({
      where: { symbol: { in: symbols } },
      orderBy: { calculatedAt: "desc" },
      distinct: ["symbol"],
    });

    return rows.map((row) => ({
      ...row,
      fearGreedIndex: row.fearGreedIndex ?? undefined,
      sentimentLabel: toLabel(row.sentimentLabel),
    }));
  }

  async findLatest(symbol: string): Promise<StoredSentiment | null> {
    const row = await prisma.marketSentiment.findFirst({
      where: { symbol },
      orderBy: { calculatedAt: "desc" },
    });
    if (!row) return null;

    return { ...row, fearGreedIndex: row.fearGreedIndex ?? undefined, sentimentLabel: toLabel(row.sentimentLabel) };
  }

  findHistorySince(symbol: string, since: Date) {
    return prisma.marketSentiment.findMany({
      where: { symbol, calculatedAt: { gte: since } },
      orderBy: { calculatedAt: "asc" },
      select: {
        sentimentScore: true,
        sentimentLabel: true,
        calculatedAt: true,
      },
    });
  }

  /**
   * 심리 구간별 사후 수익률 분포 (F004 · B9 · `DB-REQ-017` FR-55).
   *
   * - **하루 1표본.** 심리는 하루에 여러 번 계산된다. 다 세면 같은 30일 움직임을 여러 번
   *   센다 — 그날 마지막 계산만 쓴다(종목 판단 B39 의 표본 독립성과 같은 이유)
   * - **진입 · 청산 모두 "그 시각 이후 첫 일봉 종가"다.** 둘이 같은 규칙이라 간격이
   *   정확히 `horizonDays` 다. 청산 종가가 없으면 `LATERAL` 이 행을 버린다
   * - `(symbol, timeframe, timestamp)` 인덱스로 표본마다 두 번 찾는다. 심리 이력이
   *   심볼 × 날 수백~수천 행이고 **일 1회** 워커가 부른다
   */
  async forwardReturnsByBucket(
    query: SentimentForwardReturnQuery
  ): Promise<SentimentForwardReturn[]> {
    const lastBucket = Math.ceil(100 / query.bucketWidth) - 1;

    const rows = await prisma.$queryRaw<
      Array<{
        symbol: string;
        bucket_index: number;
        sample: number;
        p25: number;
        median: number;
        p75: number;
        positive_rate: number;
        window_from: Date;
        window_to: Date;
      }>
    >`
      WITH daily AS (
        SELECT DISTINCT ON (symbol, date_trunc('day', calculated_at))
               symbol, calculated_at, sentiment_score
        FROM market_sentiments
        WHERE calculated_at >= ${query.since}
        ORDER BY symbol, date_trunc('day', calculated_at), calculated_at DESC
      ),
      samples AS (
        SELECT d.symbol,
               d.calculated_at,
               LEAST(FLOOR(d.sentiment_score / ${query.bucketWidth}::float8), ${lastBucket})::int AS bucket_index,
               (exit.close / entry.close - 1)::float8 AS r
        FROM daily d
        CROSS JOIN LATERAL (
          SELECT close FROM price_history p
          WHERE p.symbol = d.symbol AND p.timeframe = '1d'
            AND p.timestamp >= d.calculated_at
          ORDER BY p.timestamp ASC LIMIT 1
        ) entry
        CROSS JOIN LATERAL (
          SELECT close FROM price_history p
          WHERE p.symbol = d.symbol AND p.timeframe = '1d'
            AND p.timestamp >= d.calculated_at + ${query.horizonDays} * INTERVAL '1 day'
          ORDER BY p.timestamp ASC LIMIT 1
        ) exit
        WHERE entry.close > 0
      )
      SELECT symbol,
             bucket_index,
             COUNT(*)::int AS sample,
             percentile_cont(0.25) WITHIN GROUP (ORDER BY r) AS p25,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY r) AS median,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY r) AS p75,
             AVG(CASE WHEN r > 0 THEN 1 ELSE 0 END)::float8 AS positive_rate,
             MIN(calculated_at) AS window_from,
             MAX(calculated_at) AS window_to
      FROM samples
      GROUP BY symbol, bucket_index
    `;

    return rows.map((row) => ({
      symbol: row.symbol,
      bucketIndex: row.bucket_index,
      sample: row.sample,
      p25: row.p25,
      median: row.median,
      p75: row.p75,
      positiveRate: row.positive_rate,
      windowFrom: row.window_from,
      windowTo: row.window_to,
    }));
  }
}
