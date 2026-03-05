// routes/investment-notification.routes.ts

import { Router } from "express";
import { InvestmentNotificationController } from "./investment-notification.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();
const controller = new InvestmentNotificationController();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: InvestmentNotification
 *   description: 투자 알림 API
 */

/**
 * @swagger
 * /investment-notifications:
 *   get:
 *     summary: 투자 알림 목록 조회
 *     tags: [InvestmentNotification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         example: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: number
 *         example: 20
 *     responses:
 *       200:
 *         description: 알림 목록 조회 성공
 */
router.get("/", controller.getNotifications.bind(controller));

/**
 * @swagger
 * /investment-notifications/{id}/read:
 *   patch:
 *     summary: 알림 읽음 처리
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
router.patch("/:id/read", controller.markRead.bind(controller));

/**
 * @swagger
 * /investment-notifications/read-all:
 *   patch:
 *     summary: 모든 알림 읽음 처리
 *     tags: [InvestmentNotification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 전체 읽음 처리 성공
 */
router.patch("/read-all", controller.markAllRead.bind(controller));

export default router;
