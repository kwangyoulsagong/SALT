// modules/feed/feed.service.ts

import prisma from "../../config/database";

type FeedItem = {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity?: number | null;
  createdAt: Date;
  payload?: any;
};

export class InvestmentFeedService {
  async getFeed(userId: string, page = 1, size = 20) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [insights, triggers, notifications] = await Promise.all([
      prisma.investmentInsight.findMany({
        where: {
          AND: [
            { OR: [{ userId }, { userId: "global" }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      prisma.playbookTrigger.findMany({
        where: {
          userId,
          status: "open",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      prisma.investmentNotification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const feed: FeedItem[] = [];

    for (const i of insights) {
      feed.push({
        id: i.id,
        type: i.type,
        title: i.title,
        summary: i.summary,
        severity: i.severity,
        createdAt: i.createdAt,
        payload: i.payload,
      });
    }

    for (const t of triggers) {
      feed.push({
        id: t.id,
        type: "playbook_trigger",
        title: t.title,
        summary: t.message,
        severity: t.severity,
        createdAt: t.createdAt,
        payload: t.payload,
      });
    }

    for (const n of notifications) {
      feed.push({
        id: n.id,
        type: "notification",
        title: n.title,
        summary: n.message,
        severity: n.severity,
        createdAt: n.createdAt,
        payload: n.payload,
      });
    }

    feed.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const start = (page - 1) * size;
    const end = start + size;

    const items = feed.slice(start, end);

    return {
      page,
      size,
      total: feed.length,
      items,
    };
  }
}
