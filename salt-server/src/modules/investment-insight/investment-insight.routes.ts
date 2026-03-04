import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { InvestmentInsightController } from "./investment-insight.controller";

const router = Router();
const investmentInsightController = new InvestmentInsightController();

// 모든 라우트에 인증 필요
router.use(authMiddleware);

/**
 * @swagger
 * /api/investment-insight/insights:
 *   get:
 *     summary: 투자 인사이트 목록 조회
 *     tags: [Investment Insight]
 *     security:
 *       - bearerAuth: []
 *     description: 사용자 포트폴리오 기반 투자 인사이트 목록을 조회합니다.
 *     responses:
 *       200:
 *         description: 인사이트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         example: risk_alert
 *                       title:
 *                         type: string
 *                         example: 자산 집중 위험
 *                       summary:
 *                         type: string
 *                         example: BTC 비중이 78%로 높습니다.
 *                       severity:
 *                         type: number
 *                         example: 70
 *                       confidence:
 *                         type: number
 *                         example: 0.9
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get("/insights", investmentInsightController.list);

/**
 * @swagger
 * /api/investment-insight/insights/generate:
 *   post:
 *     summary: 투자 위험 분석 실행
 *     tags: [Investment Insight]
 *     security:
 *       - bearerAuth: []
 *     description: 사용자의 포트폴리오를 분석하여 투자 위험 인사이트를 생성합니다.
 *     responses:
 *       200:
 *         description: 위험 분석 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Risk analysis completed
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                         example: BTC
 *                       type:
 *                         type: string
 *                         example: risk_alert
 *                       title:
 *                         type: string
 *                         example: 자산 집중 위험
 *                       summary:
 *                         type: string
 *                         example: BTC 비중이 82.1% 입니다.
 *                       severity:
 *                         type: number
 *                         example: 60
 */
router.post("/insights/generate", investmentInsightController.generate);

export default router;
