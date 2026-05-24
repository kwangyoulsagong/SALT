import { Router } from "express";
import { PortfolioController } from "./portfolio.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { PortfolioPerformanceController } from "./portfolio-performance.controller";

const router = Router();
const portfolioController = new PortfolioController();
const portfolioPerformanceController = new PortfolioPerformanceController();

/**
 * @swagger
 * tags:
 *   name: Portfolio
 *   description: 포트폴리오 추적 API
 */

/**
 * @swagger
 * /api/portfolio/transactions:
 *   post:
 *     summary: 거래 내역 추가 (매수/매도)
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - transactionType
 *               - quantity
 *               - price
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTC
 *               transactionType:
 *                 type: string
 *                 enum: [buy, sell]
 *                 example: buy
 *               quantity:
 *                 type: number
 *                 example: 0.5
 *               price:
 *                 type: number
 *                 example: 130000000
 *               fee:
 *                 type: number
 *                 example: 10000
 *               note:
 *                 type: string
 *                 example: 비트코인 매수
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 거래 내역 추가 성공
 */
router.post(
  "/transactions",
  authMiddleware,
  portfolioController.createTransaction,
);

/**
 * @swagger
 * /api/portfolio/transactions:
 *   get:
 *     summary: 거래 내역 조회
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 코인 심볼
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [buy, sell]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 거래 내역 목록
 */
router.get(
  "/transactions",
  authMiddleware,
  portfolioController.getTransactions,
);

/**
 * @swagger
 * /api/portfolio/transactions/{id}:
 *   patch:
 *     summary: 거래 내역 수정
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               price:
 *                 type: number
 *               fee:
 *                 type: number
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 */
router.patch(
  "/transactions/:id",
  authMiddleware,
  portfolioController.updateTransaction,
);

/**
 * @swagger
 * /api/portfolio/transactions/{id}:
 *   delete:
 *     summary: 거래 내역 삭제
 *     tags: [Portfolio]
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
 *         description: 삭제 성공
 */
router.delete(
  "/transactions/:id",
  authMiddleware,
  portfolioController.deleteTransaction,
);

/**
 * @swagger
 * /api/portfolio/holdings:
 *   get:
 *     summary: 보유 자산 조회
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 코인 심볼 (선택)
 *     responses:
 *       200:
 *         description: 보유 자산 목록 + 요약
 */
router.get("/holdings", authMiddleware, portfolioController.getHoldings);

/**
 * @swagger
 * /api/portfolio/stats:
 *   get:
 *     summary: 포트폴리오 통계
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 포트폴리오 통계 (총 투자금, 수익률 등)
 */
router.get("/stats", authMiddleware, portfolioController.getPortfolioStats);

/**
 * @swagger
 * /api/portfolio/internal/update-prices:
 *   post:
 *     summary: 보유 자산 현재가 업데이트 (내부 API - BFF용)
 *     tags: [Portfolio - Internal]
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
 *     responses:
 *       200:
 *         description: 업데이트 성공
 */
router.post("/internal/update-prices", portfolioController.updateHoldingPrices);

/**
 * @swagger
 * /api/portfolio/performance:
 *   get:
 *     summary: Portfolio performance chart
 *     tags: [Portfolio]
 */
router.get(
  "/performance",
  authMiddleware,
  portfolioPerformanceController.getPerformance,
);
export default router;
