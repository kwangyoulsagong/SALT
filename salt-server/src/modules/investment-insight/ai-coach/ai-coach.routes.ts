import { Router } from "express";
import { AIInvestmentCoachController } from "./ai-coach.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router = Router();
const aiInvestmentCoachController = new AIInvestmentCoachController();

router.use(authMiddleware);

/**
 * @swagger
 * /ai-coach/generate:
 *   post:
 *     summary: AI 투자 코치 분석 생성
 *     description: 사용자 포트폴리오, 시장 상태, 기술 지표 등을 기반으로 AI 투자 코치 분석을 생성합니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI 투자 코치 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "insight_123"
 *                     type:
 *                       type: string
 *                       example: "ai_coach"
 *                     title:
 *                       type: string
 *                       example: "AI 투자 코치"
 *                     summary:
 *                       type: string
 *                       example: "BTC 매수 고려"
 *                     severity:
 *                       type: number
 *                       example: 72
 *                     confidence:
 *                       type: number
 *                       example: 0.82
 *                     payload:
 *                       type: object
 *                       properties:
 *                         recommendation:
 *                           type: object
 *                           properties:
 *                             action:
 *                               type: string
 *                               example: buy
 *                             symbol:
 *                               type: string
 *                               example: BTC
 *                         market:
 *                           type: object
 *                           properties:
 *                             regime:
 *                               type: string
 *                               example: bullish
 *                         portfolio:
 *                           type: object
 *                           properties:
 *                             totalValue:
 *                               type: number
 *                               example: 12000000
 *                             concentration:
 *                               type: number
 *                               example: 0.45
 *                             riskLevel:
 *                               type: string
 *                               example: medium
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: AI 코치 생성 실패
 */
router.post("/generate", aiInvestmentCoachController.generate);

/**
 * @swagger
 * /ai-coach:
 *   get:
 *     summary: 최신 AI 투자 코치 조회
 *     description: 사용자의 최신 AI 투자 코치 분석 결과를 조회합니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI 투자 코치 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "insight_123"
 *                     summary:
 *                       type: string
 *                       example: "BTC 매수 고려"
 *                     severity:
 *                       type: number
 *                       example: 72
 *                     confidence:
 *                       type: number
 *                       example: 0.82
 *                     payload:
 *                       type: object
 *       401:
 *         description: 인증 실패
 */
router.get("/", aiInvestmentCoachController.getLatest);

export default router;
