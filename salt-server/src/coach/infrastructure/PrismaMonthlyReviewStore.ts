import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type { Jsonified, MonthlyReview, MonthlyReviewStore, StoredMonthlyReview } from "../domain";

/**
 * 월간 복기 저장 — `monthly_reviews` (`DB-REQ-031` FR-11 · FEATURE-009 FR-28).
 *
 * 한 사용자 · 한 달 한 행, **덮어쓰지 않는다.** 배치와 요청이 같은 달을 동시에 만들면 유니크 제약
 * `(user_id, month)` 이 한쪽을 막고, 막힌 쪽은 먼저 들어간 행을 읽어 돌려준다.
 *
 * `payload` 는 `JSON.stringify` 를 거친 모양이다 — `Decimal` 은 `toJSON()` 이 문자열을, `Date` 는 ISO 문자열을 낸다.
 */

const toStored = (row: { month: string; payload: Prisma.JsonValue; generatedAt: Date }): StoredMonthlyReview => ({
  month: row.month,
  payload: row.payload as unknown as Jsonified<MonthlyReview>,
  generatedAt: row.generatedAt,
});

const SELECT = { month: true, payload: true, generatedAt: true } as const;

export class PrismaMonthlyReviewStore implements MonthlyReviewStore {
  async find(userId: string, month: string): Promise<StoredMonthlyReview | null> {
    const row = await prisma.monthlyReview.findUnique({
      where: { userId_month: { userId, month } },
      select: SELECT,
    });
    return row ? toStored(row) : null;
  }

  async listMonths(userId: string, limit: number): Promise<string[]> {
    const rows = await prisma.monthlyReview.findMany({
      where: { userId },
      orderBy: { month: "desc" },
      select: { month: true },
      take: limit,
    });
    return rows.map((row) => row.month);
  }

  async saveIfAbsent(userId: string, review: MonthlyReview, generatedAt: Date): Promise<StoredMonthlyReview> {
    const payload = JSON.parse(JSON.stringify(review)) as Prisma.InputJsonValue;
    try {
      const row = await prisma.monthlyReview.create({
        data: { userId, month: review.month, payload, generatedAt },
        select: SELECT,
      });
      return toStored(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.find(userId, review.month);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
