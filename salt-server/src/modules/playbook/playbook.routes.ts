import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { PlaybookController } from "./playbook.controller";

const router = Router();
const playbookController = new PlaybookController();

// 모든 라우트 인증 필요
router.use(authMiddleware);

/**
 * @swagger
 * /api/playbooks:
 *   post:
 *     summary: 투자 전략 생성
 *     tags: [Playbook]
 *     security:
 *       - bearerAuth: []
 *     description: 사용자의 투자 전략(Playbook)을 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: BTC 전략
 *               assetType:
 *                 type: string
 *                 example: crypto
 *               targetAllocation:
 *                 type: object
 *                 example: { "BTC": 0.5, "ETH": 0.3 }
 *               rules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: sentiment_filter
 *                     symbol:
 *                       type: string
 *                       example: BTC
 *                     params:
 *                       type: object
 *                       example: { "fearGreedBelow": 30 }
 *     responses:
 *       200:
 *         description: Playbook 생성 성공
 */
router.post("/", playbookController.create);

/**
 * @swagger
 * /api/playbooks:
 *   get:
 *     summary: 투자 전략 목록 조회
 *     tags: [Playbook]
 *     security:
 *       - bearerAuth: []
 *     description: 사용자가 생성한 투자 전략 목록을 조회합니다.
 *     responses:
 *       200:
 *         description: Playbook 목록 조회 성공
 */
router.get("/", playbookController.list);

/**
 * @swagger
 * /api/playbooks/{id}:
 *   delete:
 *     summary: 투자 전략 삭제
 *     tags: [Playbook]
 *     security:
 *       - bearerAuth: []
 *     description: 특정 투자 전략을 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Playbook ID
 *     responses:
 *       200:
 *         description: Playbook 삭제 성공
 */
router.delete("/:id", playbookController.remove);

export default router;
