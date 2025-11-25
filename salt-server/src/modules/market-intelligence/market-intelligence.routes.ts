import { Router } from 'express';
import { MarketIntelligenceController } from './market-intelligence.controller';

const router = Router();
const controller = new MarketIntelligenceController();

/**
 * @swagger
 * tags:
 *   name: Market Intelligence
 *   description: 시장 심리 & 스마트 머니 추적
 */

/**
 * @swagger
 * /api/market-intelligence/{symbol}/dashboard:
 *   get:
 *     summary: 통합 대시보드 (심리 + 스마트머니)
 *     tags: [Market Intelligence]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: 코인 심볼 (예 BTC, ETH)
 *     responses:
 *       200:
 *         description: 통합 데이터
 */
router.get('/:symbol/dashboard', controller.getDashboard);

/**
 * @swagger
 * /api/market-intelligence/{symbol}/sentiment:
 *   get:
 *     summary: 시장 심리 온도계
 *     tags: [Market Intelligence]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 시장 심리 데이터
 */
router.get('/:symbol/sentiment', controller.getSentiment);

/**
 * @swagger
 * /api/market-intelligence/{symbol}/smart-money:
 *   get:
 *     summary: 똑똑한 돈 추적
 *     tags: [Market Intelligence]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 스마트 머니 데이터
 */
router.get('/:symbol/smart-money', controller.getSmartMoney);

/**
 * @swagger
 * /api/market-intelligence/{symbol}/sentiment/history:
 *   get:
 *     summary: 심리 히스토리
 *     tags: [Market Intelligence]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: 심리 히스토리
 */
router.get('/:symbol/sentiment/history', controller.getSentimentHistory);

/**
 * @swagger
 * /api/market-intelligence/{symbol}/whale-transactions:
 *   get:
 *     summary: 최근 고래 거래
 *     tags: [Market Intelligence]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 고래 거래 목록
 */
router.get('/:symbol/whale-transactions', controller.getWhaleTransactions);

export default router;
