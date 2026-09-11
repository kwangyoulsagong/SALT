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
}): StoredWhaleTransaction => ({
  id: row.id,
  symbol: row.symbol,
  transactionType: row.transactionType === "sell" ? "sell" : "buy",
  amount: row.amount,
  amountKRW: row.amountKRW,
  exchange: row.exchange ?? "",
  detectedAt: row.detectedAt,
});

export class PrismaWhaleTransactionRepository
  implements WhaleTransactionRepository
{
  /**
   * 원문은 루프 안에서 `create` 를 10번 불렀다. `createMany` 한 번으로 바꾼다 —
   * 대량 체결은 서로 독립이고 개별 결과를 쓰지 않는다.
   */
  async saveMany(records: WhaleTransactionRecord[]) {
    if (records.length === 0) return;
    await prisma.whaleTransaction.createMany({ data: records });
  }

  async findRecent(symbol: string, limit: number) {
    const rows = await prisma.whaleTransaction.findMany({
      where: { symbol },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
    return rows.map(toDomain);
  }
}
