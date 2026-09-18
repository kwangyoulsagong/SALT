import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { CoachUseCases } from "../application/api";
import { CoachToolsController } from "./coachTools.controller";

/**
 * 코치의 나머지 네 경로. **전부 원래 경로를 유지한다** (FR-35).
 *
 * | 경로 | 원문 모듈 |
 * |---|---|
 * | `/api/behavior-coach` | `modules/behavior-coach` |
 * | `/api/profit-plan` | `modules/profit-plan` |
 * | `/api/trade-preflight` | `modules/trade-preflight` |
 * | `/api/signal-performance` | `modules/signal-performance` |
 *
 * 라우터를 넷으로 나눈 이유는 `app.ts` 가 **경로별로** 등록하기 때문이다. 합치면
 * 경로가 바뀌고, 그건 BFF·프론트 계약 변경이라 이 REQ 의 일이 아니다.
 */

export const createBehaviorCoachRouter = (useCases: CoachUseCases): Router => {
  const router = Router();
  const controller = new CoachToolsController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/behavior-coach:
   *   get:
   *     summary: 투자 행동 코치 조회
   *     description: 거래 기록을 기반으로 과잉거래, 패닉셀, 추격매수 후보를 분석합니다.
   *     tags: [Behavior Coach]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 행동 코치 결과
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
   *                     status:
   *                       type: string
   *                       enum: [insufficient_data, active, stable]
   *                     tags:
   *                       type: array
   *                       items:
   *                         type: string
   *                     recommendedRules:
   *                       type: array
   *                       items:
   *                         type: string
   *       401:
   *         description: 인증 실패
   */
  router.get("/", controller.getBehaviorCoach);

  return router;
};

export const createProfitPlanRouter = (useCases: CoachUseCases): Router => {
  const router = Router();
  const controller = new CoachToolsController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/profit-plan:
   *   get:
   *     summary: 보유 종목 익절/손절 플랜 조회
   *     description: 보유 crypto 자산 기준 단계형 익절, 손절, 추세 유지 계획을 반환합니다.
   *     tags: [Profit Plan]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         schema:
   *           type: string
   *         description: 특정 심볼만 조회할 때 사용합니다.
   *         example: BTC
   *     responses:
   *       200:
   *         description: 익절/손절 플랜
   *       401:
   *         description: 인증 실패
   */
  router.get("/", controller.listProfitPlans);

  return router;
};

export const createTradePreflightRouter = (
  useCases: CoachUseCases
): Router => {
  const router = Router();
  const controller = new CoachToolsController(useCases);

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
  router.post("/", controller.checkTradePreflight);

  return router;
};

export const createSignalPerformanceRouter = (
  useCases: CoachUseCases
): Router => {
  const router = Router();
  const controller = new CoachToolsController(useCases);

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
  router.get("/", controller.getSignalPerformance);

  return router;
};
