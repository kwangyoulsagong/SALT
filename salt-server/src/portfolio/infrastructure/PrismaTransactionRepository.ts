import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  PortfolioAssetType,
  LedgerEntry,
  TimelineTrade,
  Transaction,
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

  async findOwned(userId: string, transactionId: string): Promise<Transaction | null> {
    const row = await prisma.portfolioTransaction.findFirst({ where: { id: transactionId, userId } });
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
    if (filter.assetType) where.assetType = filter.assetType;
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
        // 같은 시각 거래가 쪽 경계에서 겹치거나 빠지지 않게 id 로 끊는다
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      }),
      prisma.portfolioTransaction.count({ where }),
    ]);

    return { transactions: transactions.map(toDomain), total };
  }

  /** `compareLedger` 순서 — `buy` < `sell` 이라 문자열 정렬이 "같은 시각이면 매수 먼저"다. 계산에 쓰는 칸만 */
  async findLedger(userId: string, symbol: string, assetType: PortfolioAssetType): Promise<LedgerEntry[]> {
    const rows = await prisma.portfolioTransaction.findMany({
      where: { userId, symbol, assetType },
      orderBy: [{ transactionDate: "asc" }, { transactionType: "asc" }, { id: "asc" }],
      select: { id: true, transactionType: true, quantity: true, price: true, totalAmount: true, fee: true, transactionDate: true },
    });
    return rows.map((row) => ({ ...row, transactionType: row.transactionType === "sell" ? "sell" : "buy" }));
  }

  /** 트랜잭션 끝에 풀리는 잠금(`_xact_` — 해제를 잊는 사고가 없다, `performance-database.md` §5). 열쇠는 사람 · 자산군 · 종목 */
  async lockLedger(userId: string, symbol: string, assetType: PortfolioAssetType): Promise<void> {
    const key = `portfolio-ledger:${userId}:${assetType}:${symbol}`;
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }

  /** 수량 복원 칸 다섯만 · 오름차순 · `limit + 1` 행으로 넘침을 안다(`(user_id, …)` 인덱스) */
  async findTimeline(userId: string, limit: number): Promise<{ trades: TimelineTrade[]; truncated: boolean }> {
    const rows = await prisma.portfolioTransaction.findMany({
      where: { userId },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      take: limit + 1,
      select: { symbol: true, assetType: true, transactionType: true, quantity: true, transactionDate: true },
    });
    return {
      trades: rows.slice(0, limit).map((row) => ({
        symbol: row.symbol,
        assetType: row.assetType,
        transactionType: row.transactionType === "sell" ? "sell" : "buy",
        quantity: row.quantity,
        transactionDate: row.transactionDate,
      })),
      truncated: rows.length > limit,
    };
  }

  countByUser(userId: string, assetType?: PortfolioAssetType): Promise<number> {
    return prisma.portfolioTransaction.count({
      where: { userId, ...(assetType ? { assetType } : {}) },
    });
  }

  /** `(user_id, …)` 인덱스 앞머리 — 사용자 ≤10명이라 결과는 몇 행. Prisma `distinct` 는 메모리에서 거르므로 SQL 로(`workers-external.md`) */
  async distinctUserIds(): Promise<string[]> {
    const rows = await prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT DISTINCT user_id FROM portfolio_transactions ORDER BY user_id`;
    return rows.map((row) => row.user_id);
  }
}
