import { Router } from "express";
import { InvestmentController } from "./investment.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();
const investmentController = new InvestmentController();

// ==================== 🔓 PUBLIC ENDPOINTS (인증 불필요) ====================

/**
 * @swagger
 * /api/investment/market/overview:
 *   get:
 *     summary: 암호화폐 마켓 전체 조회 (필터/정렬/페이지네이션) - PUBLIC
 *     tags: [Investment - Public]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [trade_value, change, price, name]
 *         description: 정렬 기준 (거래대금, 변동률, 가격, 이름)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: 정렬 방향
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 1m, 3m, 6m, 1y]
 *         description: 수익률 기준 기간
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 심볼/한글/영문명 검색
 *     responses:
 *       200:
 *         description: 마켓 전체 정보
 */
router.get("/market/overview", investmentController.getMarketOverview);

/**
 * @swagger
 * /api/investment/crypto/{symbol}/price:
 *   get:
 *     summary: 실시간 가격 조회 - PUBLIC
 *     tags: [Investment - Public]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: 암호화폐 심볼 (예 BTC, ETH)
 *     responses:
 *       200:
 *         description: 실시간 가격 정보
 */
router.get("/crypto/:symbol/price", investmentController.getRealTimePrice);

/**
 * @swagger
 * /api/investment/crypto/{symbol}/chart:
 *   get:
 *     summary: 차트 데이터 조회 - PUBLIC
 *     tags: [Investment - Public]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, minute]
 *       - in: query
 *         name: unit
 *         scehma: number
 *         enum: [1,3,5, 15, 30, 60, 240]
 *       - in: query
 *         name: count
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: 차트 데이터
 */
router.get("/crypto/:symbol/chart", investmentController.getChartData);

// ==================== 🔒 PROTECTED ENDPOINTS (인증 필요) ====================

/**
 * @swagger
 * /api/investment/watchlist:
 *   post:
 *     summary: 관심 목록에 추가
 *     tags: [Investment - Protected]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetType
 *               - symbol
 *               - name
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [crypto, stock]
 *               symbol:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 관심 목록 추가 성공
 */
router.post("/watchlist", authMiddleware, investmentController.addToWatchlist);

/**
 * @swagger
 * /api/investment/watchlist:
 *   get:
 *     summary: 관심 목록 조회
 *     tags: [Investment - Protected]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetType
 *         schema:
 *           type: string
 *           enum: [crypto, stock]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: 관심 목록
 */
router.get("/watchlist", authMiddleware, investmentController.getWatchlist);

/**
 * @swagger
 * /api/investment/watchlist/{id}:
 *   delete:
 *     summary: 관심 목록에서 제거
 *     tags: [Investment - Protected]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 제거 성공
 */
router.delete(
  "/watchlist/:id",
  authMiddleware,
  investmentController.removeFromWatchlist
);

// ==================== 🔧 INTERNAL API (BFF용 - 인증 없음) ====================

/**
 * @swagger
 * /api/investment/internal/symbols:
 *   get:
 *     summary: 모든 관심목록 심볼 조회 (내부 API)
 *     tags: [Investment - Internal]
 *     responses:
 *       200:
 *         description: 심볼 목록
 */
router.get("/internal/symbols", investmentController.getAllSymbols);

/**
 * @swagger
 * /api/investment/internal/update-prices:
 *   post:
 *     summary: 관심목록 가격 일괄 업데이트 (내부 API)
 *     tags: [Investment - Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceData
 *             properties:
 *               priceData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                     currentPrice:
 *                       type: number
 *                     priceChange24h:
 *                       type: number
 *     responses:
 *       200:
 *         description: 업데이트 성공
 */
router.post("/internal/update-prices", investmentController.updatePrices);

/**
 * @swagger
 * /api/investment/internal/market/symbols:
 *   get:
 *     summary: 모든 마켓 심볼 조회 (내부 API)
 *     tags: [Investment - Internal]
 *     description: BFF Worker가 전체 실시간 구독을 위해 사용하는 API입니다. 인증이 필요하지 않습니다.
 *     responses:
 *       200:
 *         description: 심볼 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["BTC", "ETH", "DOGE", "XRP", "SOL"]
 */
router.get(
  "/internal/market/symbols",
  investmentController.getAllMarketSymbols
);

export default router;
