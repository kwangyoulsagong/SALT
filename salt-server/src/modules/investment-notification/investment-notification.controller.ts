// controllers/investment-notification.controller.ts

import { Request, Response } from "express";
import prisma from "../../config/database";
import { ResponseUtil } from "../../utils/response.util";

export class InvestmentNotificationController {
  /**
   * 알림 목록 조회
   */
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const page = Number(req.query.page ?? 1);
      const size = Number(req.query.size ?? 20);

      const [items, total] = await Promise.all([
        prisma.investmentNotification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * size,
          take: size,
        }),

        prisma.investmentNotification.count({
          where: { userId },
        }),
      ]);

      return ResponseUtil.success(res, {
        page,
        size,
        total,
        items,
      });
    } catch (error) {
      return ResponseUtil.error(res, "NOTIFICATION_FETCH_FAILED");
    }
  }

  /**
   * 읽음 처리
   */
  async markRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;

      await prisma.investmentNotification.updateMany({
        where: {
          id,
          userId,
        },
        data: {
          isRead: true,
        },
      });

      return ResponseUtil.success(res, true);
    } catch (error) {
      return ResponseUtil.error(res, "NOTIFICATION_READ_FAILED");
    }
  }

  /**
   * 전체 읽음 처리
   */
  async markAllRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      await prisma.investmentNotification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return ResponseUtil.success(res, true);
    } catch (error) {
      return ResponseUtil.error(res, "NOTIFICATION_READ_ALL_FAILED");
    }
  }
}
