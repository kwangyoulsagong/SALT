import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import {
  isNotificationKind,
  type NotificationDraft,
  type NotificationItem,
  type NotificationKind,
  type NotificationParams,
  type NotificationStore,
  type RecentNotificationQuery,
} from "../domain";

/** `payload` 에서 인자만 꺼낸다. 문자열이 아닌 값은 버린다 — 옛 행의 숫자가 새어 나가지 않게. */
const toParams = (payload: Prisma.JsonValue | null): NotificationParams => {
  const params =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Prisma.JsonObject).params
      : undefined;
  if (!params || typeof params !== "object" || Array.isArray(params)) return {};
  return Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
};

export class PrismaNotificationStore implements NotificationStore {
  async create(draft: NotificationDraft): Promise<void> {
    await prisma.investmentNotification.create({
      data: {
        userId: draft.userId,
        type: draft.kind,
        source: draft.source,
        symbol: draft.symbol,
        messageCode: draft.messageCode,
        payload: { params: draft.params },
        expiresAt: draft.expiresAt,
      },
    });
  }

  async existsSince(query: RecentNotificationQuery): Promise<boolean> {
    const row = await prisma.investmentNotification.findFirst({
      where: {
        userId: query.userId,
        source: query.source,
        symbol: query.symbol,
        messageCode: query.messageCode,
        createdAt: { gt: query.since },
      },
      select: { id: true },
    });
    return row !== null;
  }

  async list(
    userId: string,
    kinds: readonly NotificationKind[],
    page: { skip: number; take: number }
  ): Promise<{ items: NotificationItem[]; total: number }> {
    const where = { userId, type: { in: [...kinds] } };
    const [rows, total] = await Promise.all([
      prisma.investmentNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          type: true,
          symbol: true,
          messageCode: true,
          payload: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.investmentNotification.count({ where }),
    ]);

    const items = rows.flatMap((row): NotificationItem[] =>
      isNotificationKind(row.type) && row.messageCode
        ? [
            {
              id: row.id,
              kind: row.type,
              symbol: row.symbol,
              messageCode: row.messageCode,
              params: toParams(row.payload),
              isRead: row.isRead,
              createdAt: row.createdAt,
            },
          ]
        : []
    );
    return { items, total };
  }

  countUnread(userId: string, kinds: readonly NotificationKind[]): Promise<number> {
    return prisma.investmentNotification.count({
      where: { userId, isRead: false, type: { in: [...kinds] } },
    });
  }

  async markRead(
    userId: string,
    id: string,
    kinds: readonly NotificationKind[]
  ): Promise<void> {
    await prisma.investmentNotification.updateMany({
      where: { id, userId, type: { in: [...kinds] } },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string, kinds: readonly NotificationKind[]): Promise<void> {
    await prisma.investmentNotification.updateMany({
      where: { userId, isRead: false, type: { in: [...kinds] } },
      data: { isRead: true },
    });
  }
}
