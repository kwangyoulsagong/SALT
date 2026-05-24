import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { SignalPerformanceController } from "./signal-performance.controller";

const router: Router = Router();
const controller = new SignalPerformanceController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/signal-performance:
 *   get:
 *     summary: AI 코치 신호 성과 조회
 *     description: 과거 AI 코치 생성 시점 이후 가격 변화를 이용해 표본 수, 승률, 평균 수익률, 최대 낙폭을 계산합니다.
 *     tags: [Signal Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         example: BTC
 *       - in: query
 *         name: signalKey
 *         schema:
 *           type: string
 *         description: 모드 또는 신호 키 필터
 *     responses:
 *       200:
 *         description: 신호 성과
 *       401:
 *         description: 인증 실패
 */
router.get("/", controller.get);

export default router;
