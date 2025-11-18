import { Router } from 'express';
import { InvestmentController } from './investment.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const investmentController = new InvestmentController();

/**
 * @swagger
 * /api/investment/watchlist:
 *   post:
 *     summary: 관심 목록에 추가
 *     tags: [Investment]
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
router.post('/watchlist', authMiddleware, investmentController.addToWatchlist);

/**
 * @swagger
 * /api/investment/watchlist:
 *   get:
 *     summary: 관심 목록 조회
 *     tags: [Investment]
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
router.get('/watchlist', authMiddleware, investmentController.getWatchlist);

/**
 * @swagger
 * /api/investment/watchlist/{id}:
 *   delete:
 *     summary: 관심 목록에서 제거
 *     tags: [Investment]
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
router.delete('/watchlist/:id', authMiddleware, investmentController.removeFromWatchlist);

/**
 * @swagger
 * /api/investment/crypto/{symbol}/price:
 *   get:
 *     summary: 실시간 가격 조회
 *     tags: [Investment]
 *     security:
 *       - bearerAuth: []
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
router.get('/crypto/:symbol/price', authMiddleware, investmentController.getRealTimePrice);

/**
 * @swagger
 * /api/investment/crypto/{symbol}/chart:
 *   get:
 *     summary: 차트 데이터 조회
 *     tags: [Investment]
 *     security:
 *       - bearerAuth: []
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
 *           enum: [day, hour]
 *       - in: query
 *         name: count
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: 차트 데이터
 */
router.get('/crypto/:symbol/chart', authMiddleware, investmentController.getChartData);

// 내부 API (BFF Worker용)
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
router.get('/internal/symbols', investmentController.getAllSymbols);

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
 *               - symbols
 *             properties:
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 업데이트 성공
 */
router.post('/internal/update-prices', investmentController.updatePrices);

export default router;
