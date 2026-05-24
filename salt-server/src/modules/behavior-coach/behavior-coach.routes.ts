import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { BehaviorCoachController } from "./behavior-coach.controller";

const router: Router = Router();
const controller = new BehaviorCoachController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/behavior-coach:
 *   get:
 *     summary: 투자 행동 코치 조회
 *     description: 거래 기록을 기반으로 과잉거래, 패닉셀, 추격매수 후보를 분석합니다.
 *     tags: [Behavior Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 행동 코치 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [insufficient_data, active, stable]
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     recommendedRules:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: 인증 실패
 */
router.get("/", controller.get);

export default router;
