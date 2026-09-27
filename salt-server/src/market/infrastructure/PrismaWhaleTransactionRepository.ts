import prisma from "../../shared/infrastructure/prisma";
import type {
  StoredWhaleTransaction,
  WhaleTransactionRecord,
  WhaleTransactionRepository,
} from "../domain";

const toDomain = (row: {
  id: string;
  symbol: string;
  transactionType: string;
  amount: number;
  amountKRW: number;
  exchange: string | null;
  detectedAt: Date;
  tradedAt: Date | null;
  sequentialId: bigint | null;
}): StoredWhaleTransaction => ({
  id: row.id,
  symbol: row.symbol,
  transactionType: row.transactionType === "sell" ? "sell" : "buy",
  amount: row.amount,
  amountKRW: row.amountKRW,
  exchange: row.exchange ?? "",
  detectedAt: row.detectedAt,
  ...(row.tradedAt ? { tradedAt: row.tradedAt } : {}),
  ...(row.sequentialId !== null ? { sequentialId: Number(row.sequentialId) } : {}),
});

/** 발생 시각이 있는 행이 먼저, 그 안에서 최신순. 옛 행(발생 시각 없음)은 도착 시각으로 뒤에 붙는다. */
const RECENT_ORDER = [
  { tradedAt: { sort: "desc", nulls: "last" } },
  { detectedAt: "desc" },
] as const;

export class PrismaWhaleTransactionRepository
  implements WhaleTransactionRepository
{
  /**
   * 원문은 루프 안에서 `create` 를 10번 불렀다. `createMany` 한 번으로 바꾼다 —
   * 대량 체결은 서로 독립이고 개별 결과를 쓰지 않는다.
   */
  async saveMany(records: WhaleTransactionRecord[]) {
    if (records.length === 0) return 0;
    const result = await prisma.whaleTransaction.createMany({
      data: records.map(({ sequentialId, ...rest }) => ({
        ...rest,
        ...(sequentialId === undefined ? {} : { sequentialId: BigInt(sequentialId) }),
      })),
      // 같은 체결이 두 회차에 걸쳐 오면 한 번만 — (symbol, sequential_id) 유니크
      skipDuplicates: true,
    });
    return result.count;
  }

  async latestTradedAt(symbols: string[]) {
    if (symbols.length === 0) return new Map<string, Date>();
    const rows = await prisma.whaleTransaction.groupBy({
      by: ["symbol"],
      where: { symbol: { in: symbols }, tradedAt: { not: null } },
      _max: { tradedAt: true },
    });
    return new Map(
      rows.flatMap((row) => (row._max.tradedAt ? [[row.symbol, row._max.tradedAt] as const] : []))
    );
  }

  /**
   * 여러 심볼의 최근 대량 체결.
   *
   * `limit` 은 **심볼별이 아니라 전체**다 — 원문(`ai-coach-feature.extractor`)이
   * `take: 100` 하나로 전 심볼을 받아 합산했고 그 모양을 유지한다.
   */
  async findRecentForSymbols(symbols: string[], limit: number) {
    if (symbols.length === 0) return [];

    const rows = await prisma.whaleTransaction.findMany({
      where: { symbol: { in: symbols } },
      orderBy: [...RECENT_ORDER],
      take: limit,
    });
    return rows.map(toDomain);
  }

  async findRecent(symbol: string, limit: number) {
    const rows = await prisma.whaleTransaction.findMany({
      where: { symbol },
      orderBy: [...RECENT_ORDER],
      take: limit,
    });
    return rows.map(toDomain);
  }
}
