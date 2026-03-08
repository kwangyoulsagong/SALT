import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { PlaybookTriggerController } from "./playbook-trigger.controller";

const router = Router();
const controller = new PlaybookTriggerController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/playbook-triggers:
 *   get:
 *     summary: 전략 트리거 목록 조회
 *     tags: [Playbook Trigger]
 *     security:
 *       - bearerAuth: []
 *     description: 사용자의 투자 전략에서 발생한 트리거 목록을 조회합니다.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: open
 *     responses:
 *       200:
 *         description: 트리거 목록 조회 성공
 */
router.get("/", controller.list);

/**
 * @swagger
 * /api/playbook-triggers/{id}/resolve:
 *   post:
 *     summary: 전략 트리거 해결
 *     tags: [Playbook Trigger]
 *     security:
 *       - bearerAuth: []
 *     description: 특정 트리거를 해결 상태로 변경합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post("/:id/resolve", controller.resolve);

export default router;
