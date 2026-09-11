import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  PortfolioAssetType,
  Transaction,
  TransactionFact,
  TransactionFilter,
  TransactionRepository,
} from "../domain";

/**
 * Prisma row → 도메인 타입 (`ddd-infrastructure.md` §2).
 *
 * `transactionType` 은 DB 에서 **자유 문자열**(`String`)이다. 도메인은 두 값만 알고,
 * 그 좁히기가 여기서 한 번 일어난다 — 모르는 값은 `buy` 로 본다. 컬럼을 enum 으로
 * 승격하는 것은 `DB-REQ-*` 의 일이다.
 */
const toDomain = (row: {
  id: string;
  userId: string;
  symbol: string;
  assetType: PortfolioAssetType;
  transactionType: string;
  quantity: number;
  price: number;
  totalAmount: number;
  fee: number;
  note: string | null;
  transactionDate: Date;
}): Transaction => ({
  id: row.id,
  userId: row.userId,
  symbol: row.symbol,
  assetType: row.assetType,
  transactionType: row.transactionType === "sell" ? "sell" : "buy",
  quantity: row.quantity,
  price: row.price,
  totalAmount: row.totalAmount,
  fee: row.fee,
  note: row.note,
  transactionDate: row.transactionDate,
});

export class PrismaTransactionRepository implements TransactionRepository {
  async create(input: {
    userId: string;
    symbol: string;
    assetType: PortfolioAssetType;
    transactionType: "buy" | "sell";
    quantity: number;
    price: number;
    totalAmount: number;
    fee: number;
    note?: string;
    transactionDate: Date;
  }): Promise<Transaction> {
    return toDomain(await prisma.portfolioTransaction.create({ data: input }));
  }

  async findById(transactionId: string): Promise<Transaction | null> {
    const row = await prisma.portfolioTransaction.findUnique({
      where: { id: transactionId },
    });
    return row ? toDomain(row) : null;
  }

  async update(
    transactionId: string,
    patch: Partial<
      Pick<
        Transaction,
        "quantity" | "price" | "totalAmount" | "fee" | "note" | "transactionDate"
      >
    >
  ): Promise<Transaction> {
    return toDomain(
      await prisma.portfolioTransaction.update({
        where: { id: transactionId },
        data: patch,
      })
    );
  }

  async delete(transactionId: string): Promise<void> {
    await prisma.portfolioTransaction.delete({ where: { id: transactionId } });
  }

  async findPage(filter: TransactionFilter) {
    const where: Prisma.PortfolioTransactionWhereInput = {
      userId: filter.userId,
    };

    if (filter.symbol) where.symbol = filter.symbol.toUpperCase();
    if (filter.transactionType) where.transactionType = filter.transactionType;
    if (filter.startDate || filter.endDate) {
      where.transactionDate = {
        ...(filter.startDate ? { gte: filter.startDate } : {}),
        ...(filter.endDate ? { lte: filter.endDate } : {}),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.portfolioTransaction.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { transactionDate: "desc" },
      }),
      prisma.portfolioTransaction.count({ where }),
    ]);

    return { transactions: transactions.map(toDomain), total };
  }

  /**
   * 재계산 입력.
   *
   * **`transactionDate` 오름차순이 이 메서드의 계약**이다 — FIFO 가 입력 순서대로
   * 원가를 소진한다. 계산에 쓰는 다섯 컬럼만 읽는다.
   */
  async findForRecalculation(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType
  ): Promise<TransactionFact[]> {
    const rows = await prisma.portfolioTransaction.findMany({
      where: { userId, symbol, assetType },
      orderBy: { transactionDate: "asc" },
      select: {
        transactionType: true,
        quantity: true,
        price: true,
        totalAmount: true,
        fee: true,
      },
    });

    return rows.map((row) => ({
      transactionType: row.transactionType === "sell" ? "sell" : "buy",
      quantity: row.quantity,
      price: row.price,
      totalAmount: row.totalAmount,
      fee: row.fee,
    }));
  }

  countByUser(userId: string): Promise<number> {
    return prisma.portfolioTransaction.count({ where: { userId } });
  }
}
