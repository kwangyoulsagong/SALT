// modules/feed/feed.service.ts

import prisma from "../../shared/infrastructure/prisma";

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

    // 알림은 Kotlin notification 서비스로 옮겼다(SRV-REQ-048, 서버 S2c) — 동면 피드엔 인사이트만 남는다
    const insights = await prisma.investmentInsight.findMany({
      where: {
        AND: [
          { OR: [{ userId }, { userId: "global" }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

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
