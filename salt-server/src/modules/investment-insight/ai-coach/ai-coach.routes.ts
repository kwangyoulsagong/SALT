import { Router } from "express";
import { AIInvestmentCoachController } from "./ai-coach.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router: Router = Router();
const aiInvestmentCoachController = new AIInvestmentCoachController();

/**
 * @swagger
 * /api/ai-coach/explain:
 *   post:
 *     summary: AI 코치 해설 (Gemini)
 *     description: 종목·모드·근거·뉴스를 받아 한국어 해설(왜 단타/장기, 예상 수익폭, 뉴스 5줄 요약)을 생성합니다. 5분 캐시.
 *     tags: [AI Coach]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, koreanName, mode, currentPrice, change24h, tradeValue24h, confidence, evidence]
 *             properties:
 *               symbol: { type: string, example: BTC }
 *               koreanName: { type: string, example: 비트코인 }
 *               mode: { type: string, enum: [scalp, long_term] }
 *               currentPrice: { type: number, example: 129913000 }
 *               change24h: { type: number, example: -1.55 }
 *               tradeValue24h: { type: number, example: 350100000000 }
 *               confidence: { type: number, example: 82 }
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label: { type: string }
 *                     value: { type: string }
 *               news:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title: { type: string }
 *                     summary: { type: string }
 *                     source: { type: string }
 *                     sentiment: { type: string }
 *     responses:
 *       200: { description: 해설 생성 성공 }
 *       400: { description: 요청 검증 실패 }
 *       500: { description: LLM 호출 실패 }
 */
// NOTE: public for prototype demo. TODO before prod: add rate-limit + auth.
router.post("/explain", aiInvestmentCoachController.explain);

router.use(authMiddleware);

/**
 * @swagger
 * /api/ai-coach/profile:
 *   get:
 *     summary: AI 투자 코치 프로필 조회
 *     description: 인증 사용자의 투자 성향, 리스크 한도, 지원 모드를 조회합니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
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
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     riskTolerance:
 *                       type: string
 *                       example: medium
 *                     maxSingleAssetWeight:
 *                       type: number
 *                       example: 0.6
 *                     rebalanceBand:
 *                       type: number
 *                       example: 0.1
 *                     panicSellWindowHours:
 *                       type: integer
 *                       example: 24
 *                     defaultMode:
 *                       type: string
 *                       enum: [scalp, long_term]
 *                       example: scalp
 *                     notificationLevel:
 *                       type: string
 *                       example: medium
 *                     supportedModes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [scalp, long_term]
 *       401:
 *         description: 인증 실패
 */
router.get("/profile", aiInvestmentCoachController.getProfile);

/**
 * @swagger
 * /api/ai-coach/profile:
 *   patch:
 *     summary: AI 투자 코치 프로필 저장
 *     description: 투자 성향, 단일 자산 비중 한도, 리밸런싱 밴드, 패닉셀 분석 창을 저장합니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskTolerance:
 *                 type: string
 *                 enum: [low, medium, high]
 *               maxSingleAssetWeight:
 *                 type: number
 *                 minimum: 0.05
 *                 maximum: 1
 *               rebalanceBand:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 0.5
 *               panicSellWindowHours:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 168
 *               defaultMode:
 *                 type: string
 *                 enum: [scalp, long_term]
 *               notificationLevel:
 *                 type: string
 *                 enum: [low, medium, high]
 *     responses:
 *       200:
 *         description: 프로필 저장 성공
 *       400:
 *         description: 요청 검증 실패
 *       401:
 *         description: 인증 실패
 */
router.patch("/profile", aiInvestmentCoachController.updateProfile);

/**
 * @swagger
 * /api/ai-coach/feedback:
 *   post:
 *     summary: AI 코치 피드백 기록
 *     description: 사용자가 코치 판단을 저장, 무시, 실행 참고했는지 기록합니다. 주문 실행은 수행하지 않습니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, mode, action]
 *             properties:
 *               insightId:
 *                 type: string
 *               symbol:
 *                 type: string
 *                 example: BTC
 *               mode:
 *                 type: string
 *                 enum: [scalp, long_term]
 *               action:
 *                 type: string
 *                 enum: [followed, ignored, saved, dismissed]
 *               outcome:
 *                 type: string
 *                 enum: [unknown, profit, loss, breakeven]
 *               note:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: 피드백 기록 성공
 *       400:
 *         description: 요청 검증 실패
 *       401:
 *         description: 인증 실패
 */
router.post("/feedback", aiInvestmentCoachController.feedback);

/**
 * @swagger
 * /api/ai-coach/generate:
 *   post:
 *     summary: AI 투자 코치 분석 생성
 *     description: 사용자 포트폴리오, 시장 상태, 기술 지표 등을 기반으로 AI 투자 코치 분석을 생성합니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTC
 *               mode:
 *                 type: string
 *                 enum: [scalp, long_term]
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
 * /api/ai-coach:
 *   get:
 *     summary: AI 투자 코치 조회
 *     description: 쿼리가 없으면 최신 AI 코치를 조회하고, symbol/mode/preview 쿼리가 있으면 선택 종목의 단타/장기 판단을 조회합니다.
 *     tags: [AI Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         example: BTC
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [scalp, long_term]
 *       - in: query
 *         name: preview
 *         schema:
 *           type: boolean
 *         description: true이면 프리뷰 용도 응답
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
