import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { NotificationUseCases } from "../application/api";
import { NotificationController } from "./notification.controller";

/**
 * `notification` 의 HTTP 경로. **경로는 옛 `modules/investment-notification` 과 같다.**
 * 바뀐 것은 범위(`signal_update` 만)와 항목 모양(문장 대신 `messageCode` + `params`)이다.
 * 생성 경로는 HTTP 로 열지 않는다 — 만드는 쪽은 공개 API(`NotificationApi.publish`)뿐이다.
 */
export const createNotificationRouter = (useCases: NotificationUseCases): Router => {
  const router = Router();
  const controller = new NotificationController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * tags:
   *   name: InvestmentNotification
   *   description: 알림 — `signal_update` 1종 (SRV-REQ-008 FR-20)
   */

  /**
   * @swagger
   * /api/investment-notifications:
   *   get:
   *     summary: 알림 목록 (signal_update 만, 최신순)
   *     description: 항목은 `{ id, kind, symbol, messageCode, params, isRead, createdAt }`. 완성 문장과 금액이 없다 — 문장은 프론트 i18n 이 `messageCode` 로 만든다
   *     tags: [InvestmentNotification]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 50
   *     responses:
   *       200:
   *         description: "{ page, size, total, items }"
   */
  router.get("/", controller.getNotifications);

  /**
   * @swagger
   * /api/investment-notifications/{id}/read:
   *   patch:
   *     summary: 알림 읽음 (본인 · signal_update 만)
   *     tags: [InvestmentNotification]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 읽음 처리 성공
   */
  router.patch("/:id/read", controller.markRead);

  /**
   * @swagger
   * /api/investment-notifications/read-all:
   *   patch:
   *     summary: 모두 읽음 (signal_update 만 — 옛 종류 행은 건드리지 않는다)
   *     tags: [InvestmentNotification]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 전체 읽음 처리 성공
   */
  router.patch("/read-all", controller.markAllRead);

  /**
   * @swagger
   * /api/investment-notifications/unread-count:
   *   get:
   *     summary: 안 읽은 알림 수 (목록에 보이는 것과 같은 범위)
   *     tags: [InvestmentNotification]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: "{ unreadCount }"
   */
  router.get("/unread-count", controller.getUnreadCount);

  return router;
};
