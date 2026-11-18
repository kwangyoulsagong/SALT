import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { PortfolioUseCases } from "../application/api";
import { PortfolioController } from "./portfolio.controller";

/**
 * `portfolio` 의 HTTP 경로. **`/api/portfolio` 를 그대로 유지한다** (FR-35).
 *
 * 성과 차트는 별도 컨트롤러였다. 같은 컨텍스트의 같은 리소스이고 판단이 없는
 * 핸들러 하나였으므로 `PortfolioController` 로 합쳤다.
 */
export const createPortfolioRouter = (useCases: PortfolioUseCases): Router => {
  const router = Router();
  const portfolioController = new PortfolioController(useCases);

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
   *               assetType:
   *                 type: string
   *                 enum: [crypto, kr_stock]
   *                 default: crypto
   *                 description: 국내 주식(`kr_stock`)은 마스터에 있는 6자리 코드만. 단가는 호가 단위 배수가 아니어도 받는다
   *               symbol:
   *                 type: string
   *                 example: BTC
   *                 description: 코인 심볼 또는 국내 주식 6자리 코드(예 005930)
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
   *       400:
   *         description: 보유 수량 부족 · 입력 형식 오류
   *       404:
   *         description: 국내 주식 — 비소유자 · 없는 코드(같은 응답)
   *       503:
   *         description: 국내 주식 꺼짐(KIS 키 없음)
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
  /**
   * @swagger
   * /api/portfolio/summary:
   *   get:
   *     summary: 보유 요약 (홈 "주식" 섹션)
   *     tags: [Portfolio]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: |
   *           한 줄에 들어갈 넷과 합계. `fxRateUsed`·`fxBasisCode` 는 **아직 언제나 null**
   *           이다 — 보유가 전부 원화 크립토이고 `fx` 컨텍스트가 없다(F001·F002).
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           symbol:
   *                             type: string
   *                           assetType:
   *                             type: string
   *                             enum: [crypto, stock]
   *                           currentValue:
   *                             type: number
   *                           profitRate:
   *                             type: number
   *                     totalKrw:
   *                       type: number
   *                     fxRateUsed:
   *                       type: number
   *                       nullable: true
   *                     fxBasisCode:
   *                       type: string
   *                       nullable: true
   *       401:
   *         description: 인증 실패
   */
  router.get("/summary", authMiddleware, portfolioController.getSummary);

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
    portfolioController.getPerformance,
  );

  /**
   * @swagger
   * /api/portfolio/position:
   *   get:
   *     summary: 포지션 개요 — Hero 6항목 · 리스크 레이더 4축 (F006 G절)
   *     description: |
   *       보유가 없으면 `empty: true` 이고 `hero` · `radar` 는 null(0 으로 그리지 않는다).
   *       금액은 원 단위 정수, 비율은 %. 30일 수익률은 매수 · 매도 금액을 뺀 시간가중이고, 30일 전부터 들고 있지 않았으면 null.
   *       레이더 축마다 `value`(0~100 점, 재료가 모자라면 null) · `raw`(원래 단위) · `limit` · `breached` · `reasonCode`.
   *       축 정의 · 상한은 서버 설정(`PORTFOLIO_RADAR_*`). 사용자는 토큰으로 정한다.
   *     tags: [Portfolio]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data:
   *                   type: object
   *                   properties:
   *                     empty: { type: boolean }
   *                     hero:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         totalValueKrw: { type: integer }
   *                         unrealizedProfitKrw: { type: integer }
   *                         unrealizedProfitRatePct: { type: number, nullable: true }
   *                         investedKrw: { type: integer }
   *                         holdingsCount: { type: integer }
   *                         topWeight:
   *                           type: object
   *                           nullable: true
   *                           properties:
   *                             symbol: { type: string }
   *                             assetType: { type: string, enum: [crypto, stock, kr_stock] }
   *                             pct: { type: number }
   *                         return30dPct: { type: number, nullable: true }
   *                     radar:
   *                       type: array
   *                       nullable: true
   *                       items:
   *                         type: object
   *                         properties:
   *                           key: { type: string, enum: [concentration, volatility, drawdown, news] }
   *                           value: { type: number, nullable: true }
   *                           raw: { type: number, nullable: true }
   *                           limit: { type: number }
   *                           breached: { type: boolean }
   *                           reasonCode: { type: string, enum: [over_limit, within_limit, insufficient_data] }
   *                           subject: { type: string, nullable: true }
   *                     unvaluedSymbols: { type: array, items: { type: string } }
   *                     degraded: { type: boolean }
   *                     degradedReasons:
   *                       type: array
   *                       items: { type: string, enum: [unvalued_holding, timeline_truncated, missing_close, flow_unavailable, news_unavailable] }
   *       401:
   *         description: 인증 실패
   */
  router.get("/position", authMiddleware, portfolioController.getPositionOverview);

  /**
   * @swagger
   * /api/portfolio/position/flow:
   *   get:
   *     summary: 평가금 흐름 — 그날 실제 수량 × 일봉 종가 + 기간 최대 낙폭 (F006 G절 FR-71)
   *     description: |
   *       점은 KST 날짜별 평가금(원). MDD · 구간 수익률은 매수 · 매도 금액을 뺀 시간가중 지수로 잰다(판 날이 낙폭이 되지 않게).
   *       과거 사실이고 예측이 아니다. 종가가 아직 없던 보유는 `missingSymbols` + `degraded`.
   *     tags: [Portfolio]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: range
   *         schema: { type: string, enum: ['1w', '1m', '3m', '1y'], default: '1m' }
   *     responses:
   *       200:
   *         description: 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data:
   *                   type: object
   *                   properties:
   *                     range: { type: string }
   *                     points:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           date: { type: string, format: date }
   *                           valueKrw: { type: integer }
   *                     maxDrawdown:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         pct: { type: number }
   *                         peakDate: { type: string, format: date }
   *                         troughDate: { type: string, format: date }
   *                     periodReturnPct: { type: number, nullable: true }
   *                     missingSymbols: { type: array, items: { type: string } }
   *                     degraded: { type: boolean }
   *                     degradedReasons: { type: array, items: { type: string, enum: [timeline_truncated, missing_close] } }
   *       400:
   *         description: 모르는 기간
   *       401:
   *         description: 인증 실패
   */
  router.get("/position/flow", authMiddleware, portfolioController.getPositionFlow);
  return router;
};
