import prisma from "../../shared/infrastructure/prisma";
import {
  SentimentLabel,
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
}
