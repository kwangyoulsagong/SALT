import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { NotificationUseCases } from "../application/api";
import { listNotificationsQuerySchema } from "./dto/notification.dto";

/** 요청을 유스케이스 입력으로 옮긴다. **판단이 없다** — 1종 제한은 유스케이스가 건다. */
export class NotificationController {
  constructor(private readonly useCases: NotificationUseCases) {}

  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paging = listNotificationsQuerySchema.parse(req.query);
      const result = await this.useCases.listNotifications.execute(req.user!.userId, paging);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.useCases.markNotificationRead.execute(req.user!.userId, req.params.id);
      return ResponseUtil.success(res, true);
    } catch (error) {
      next(error);
    }
  };

  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.useCases.markAllNotificationsRead.execute(req.user!.userId);
      return ResponseUtil.success(res, true);
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const unreadCount = await this.useCases.countUnreadNotifications.execute(
        req.user!.userId
      );
      return ResponseUtil.success(res, { unreadCount });
    } catch (error) {
      next(error);
    }
  };
}
