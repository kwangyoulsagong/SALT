import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { ProfitPlanController } from "./profit-plan.controller";

const router: Router = Router();
const controller = new ProfitPlanController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/profit-plan:
 *   get:
 *     summary: 보유 종목 익절/손절 플랜 조회
 *     description: 보유 crypto 자산 기준 단계형 익절, 손절, 추세 유지 계획을 반환합니다.
 *     tags: [Profit Plan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 특정 심볼만 조회할 때 사용합니다.
 *         example: BTC
 *     responses:
 *       200:
 *         description: 익절/손절 플랜
 *       401:
 *         description: 인증 실패
 */
router.get("/", controller.list);

export default router;
