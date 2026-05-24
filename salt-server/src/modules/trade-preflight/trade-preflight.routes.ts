import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { TradePreflightController } from "./trade-preflight.controller";

const router: Router = Router();
const controller = new TradePreflightController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/trade-preflight:
 *   post:
 *     summary: 외부 주문 전 리스크 체크
 *     description: SALT 내부 주문 실행 없이 진입가, 손절가, 익절가, 금액 기준 손익비와 포트폴리오 비중 영향을 계산합니다.
 *     tags: [Trade Preflight]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, entryPrice, amount]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTC
 *               entryPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 95000000
 *               stopPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 91000000
 *               takeProfitPrices:
 *                 type: array
 *                 maxItems: 5
 *                 items:
 *                   type: number
 *                 example: [99000000, 105000000]
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 500000
 *               mode:
 *                 type: string
 *                 enum: [scalp, long_term]
 *     responses:
 *       200:
 *         description: 체크 결과
 *       400:
 *         description: 요청 검증 실패
 *       401:
 *         description: 인증 실패
 */
router.post("/", controller.check);

export default router;
