import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import { rateLimit } from "../../shared/presentation/rateLimit";
import type { CoachUseCases } from "../application/api";
import { AICoachController } from "./aiCoach.controller";

/**
 * `/api/ai-coach` — **경로를 그대로 유지한다** (FR-35).
 *
 * ## `/explain` 도 인증 뒤에 있다 (`SRV-REQ-025` FR-11, 2026-09-22)
 *
 * 원래는 프로토타입 데모용으로 `authMiddleware` 위에 있는 공개 경로였다. BFF 가 먼저
 * 토큰을 보내게 됐고(`BFF-REQ-025` FR-32) 프론트도 로그인 사용자만 부른다 — 이제 인증을
 * 붙여도 끊기는 소비처가 없다. 게이트 판정에 보유 여부가 들어가서 `userId` 도 필요하다.
 *
 * ## 요청 제한은 남긴다 (FR-12)
 *
 * **LLM 을 부르는 경로**다. 호출마다 비용이 들고 캐시는 5분이다. **분당 10회** —
 * 사용자 ≤10명 서버에서 정상 사용이 닿지 않는 수이고, 자동 호출은 여기서 걸린다.
 */
const EXPLAIN_RATE_LIMIT = { windowMs: 60_000, max: 10 };
export const createAICoachRouter = (useCases: CoachUseCases): Router => {
  const router = Router();
  const controller = new AICoachController(useCases);
  // 단건 · 스트림이 **한 한도**를 나눠 쓴다 — 따로 두면 분당 20회가 된다
  const explainLimit = rateLimit(EXPLAIN_RATE_LIMIT);

  /**
   * @swagger
   * /api/ai-coach/explain:
   *   post:
   *     summary: AI 코치 해설 (Gemini)
   *     description: 종목·모드·근거·뉴스를 받아 한국어 해설(왜 단타/장기, 관찰 기간, 뉴스 요약 — 뉴스 수 이하, 최대 5줄)을 생성합니다. 판단이 3종 게이트를 못 넘으면 LLM 을 부르지 않고 `{ renderable false, blockedReason }` 을 200 으로 줍니다. 수익률·목표가 예측은 생성하지 않습니다. 5분 캐시.
   *     tags: [AI Coach]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [symbol, koreanName, mode, currentPrice, change24h, tradeValue24h, evidence]
   *             properties:
   *               symbol: { type: string, example: BTC }
   *               koreanName: { type: string, example: 비트코인 }
   *               mode: { type: string, enum: [scalp, long_term] }
   *               currentPrice: { type: number, example: 129913000 }
   *               change24h: { type: number, example: -1.55 }
   *               tradeValue24h: { type: number, example: 350100000000 }
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
   *       401: { description: 인증 필요 }
   *       429: { description: 분당 10회 초과 }
   *       500: { description: LLM 호출 실패 }
   */
  router.post(
    "/explain",
    authMiddleware,
    explainLimit,
    controller.explain
  );

  /**
   * @swagger
   * /api/ai-coach/explain/stream:
   *   post:
   *     summary: 해설 스트림 (SSE) — 템플릿 문장을 먼저 흘리고, 검증을 통과한 LLM 문장으로 바꾼다
   *     tags: [AI Coach]
   *     security: [{ bearerAuth: [] }]
   *     description: |
   *       본문은 `/explain` 과 같다. 이벤트 — message.start · message.step · message.blocked · message.card ·
   *       message.delta · message.replace · message.done · message.error · ping. 분당 한도는 `/explain` 과 같다.
   *     responses:
   *       200: { description: text/event-stream }
   *       400: { description: 요청 검증 실패 }
   *       401: { description: 인증 필요 }
   *       429: { description: 분당 10회 초과 }
   */
  router.post(
    "/explain/stream",
    authMiddleware,
    explainLimit,
    controller.explainStream
  );

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
   *                       description: 저장된 값. 고른 적이 없으면 기본값 scalp
   *                     notificationLevel:
   *                       type: string
   *                       enum: [low, medium, high]
   *                       example: medium
   *                       description: 저장된 값. 고른 적이 없으면 기본값 medium
   *                     supportedModes:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: [scalp, long_term]
   *       401:
   *         description: 인증 실패
   */
  router.get("/profile", controller.getProfile);

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
  router.patch("/profile", controller.updateProfile);

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
  router.post("/feedback", controller.feedback);

  /**
   * @swagger
   * /api/ai-coach/generate:
   *   post:
   *     summary: AI 투자 코치 분석 생성 요청 (비동기)
   *     description: 사용자 포트폴리오, 시장 상태, 기술 지표 등을 기반으로 AI 투자 코치 분석 생성을 **요청**합니다. 즉시 202 를 돌려주고 생성은 뒤에서 돕니다.
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
   *       202:
   *         description: |
   *           받았다. 생성은 뒤에서 돈다 — 결과는 `GET /api/coach/detail` 과
   *           `GET /api/coach/generation-status` 로 본다. 워커 생성은 쿨다운에 걸리지 않는다
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
   *                 data:
   *                   type: object
   *                   properties:
   *                     requestId:
   *                       type: string
   *                     requestedAt:
   *                       type: string
   *                       format: date-time
   *       429:
   *         description: |
   *           수동 재생성 쿨다운 중(기본 5분, 설정값). `Retry-After` 헤더와 본문 `retryAfterSeconds` 가 같은 값이다
   *         headers:
   *           Retry-After:
   *             schema:
   *               type: integer
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 code:
   *                   type: string
   *                   example: COACH_REGENERATE_COOLDOWN
   *                 message:
   *                   type: string
   *                 retryAfterSeconds:
   *                   type: integer
   *                   example: 240
   *       401:
   *         description: 인증 실패
   *       500:
   *         description: 서버 오류. 생성 자체의 실패는 202 뒤에 일어나 생성 기록(`generation-status`)에 남는다
   */
  router.post("/generate", controller.generate);

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
   *         description: 없으면 사용자 프로필의 defaultMode, 그것도 없으면 scalp
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
  router.get("/", controller.getLatest);

  return router;
};
