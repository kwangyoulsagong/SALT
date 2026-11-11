import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { CoachUseCases } from "../application/api";
import { AICoachController } from "./aiCoach.controller";

/**
 * `/api/ai-coach` — **경로를 그대로 유지한다** (FR-35).
 *
 * ## 해설은 저장값 읽기다 (F017 v2 단계 3, 2026-11-11)
 *
 * 예전 `POST /explain` · `/explain/stream` 은 요청마다 LLM 을 불렀다(분당 10회 한도 · 5분 캐시). 이제 배치가 종목 지문이 바뀐
 * 종목만 미리 만들어 두고(`GenerateExplanationSnapshots`) 이 경로는 저장본만 읽는다 — 요청 경로 LLM 0(`SRV-REQ-053` 불변식 1).
 * 두 옛 경로는 소비처(BFF · 화면)가 같은 PR 에서 옮겨 가서 지웠다(제거 = 404, `ddd-presentation.md` §5).
 */
export const createAICoachRouter = (useCases: CoachUseCases): Router => {
  const router = Router();
  const controller = new AICoachController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/ai-coach/explanation:
   *   get:
   *     summary: 종목 해설 — 저장값 읽기, 4단 중 하나(빈 칸 0)
   *     description: |
   *       F017 v2 단계 3(`SRV-REQ-053` FR-3). LLM 을 부르지 않는다 — 배치가 종목 지문(판정 · 관측이 문턱 어느 쪽인가 · 꼬리표 ·
   *       맨 위 뉴스 · 규칙 · 프롬프트 · 검증기 버전)이 바뀐 종목만 미리 만든다. `tier` —
   *       `latest`(지문 같은 AI 해설) · `previous`(같은 방향 · 판단 기간 안의 이전 AI 해설 — `generatedAt` 을 같이 보인다) ·
   *       `template`(사실표 문장 — AI 표시 없음) · `none`(현재가가 없어 사실표를 못 만듦 — 규칙 판단 한 줄 · 근거).
   *       `sentences` 는 늘 하나 이상, 문장마다 `citations`(사실표 id · 이름 · 시각 · 뉴스 주소) 하나 이상.
   *       AI 단이 아니면 이 종목 · 모드를 배치에 알려 다음 회차(10분)에 만든다. 시장 층 — 사람마다 같은 답(보유 무관)
   *     tags: [AI Coach]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: symbol, required: true, schema: { type: string, example: BTC } }
   *       - { in: query, name: mode, required: true, schema: { type: string, enum: [scalp, long_term] } }
   *     responses:
   *       200:
   *         description: 해설
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
   *                     symbol: { type: string }
   *                     mode: { type: string, enum: [scalp, long_term] }
   *                     tier: { type: string, enum: [latest, previous, template, none] }
   *                     aiGenerated: { type: boolean }
   *                     provider: { type: string, nullable: true, enum: [local_claude, local_codex, gemini] }
   *                     generatedAt: { type: string, format: date-time }
   *                     disclaimer: { type: string }
   *                     sentences:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           section: { type: string, enum: [modeReasoning, keyDrivers, risks, newsSummary] }
   *                           text: { type: string }
   *                           citations:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 id: { type: string, example: rsi }
   *                                 label: { type: string, example: RSI }
   *                                 at: { type: string, format: date-time, nullable: true }
   *                                 url: { type: string, nullable: true }
   *       400: { description: 요청 검증 실패 }
   *       401: { description: 인증 필요 }
   */
  router.get("/explanation", controller.explanation);

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
   *                     hidePurchasePrice:
   *                       type: boolean
   *                       description: 매입가 숨김(F009 FR-27). 기본 false. 리스크 예산은 이 응답에 없다 — GET /api/coach/risk-budget
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
   *               hidePurchasePrice:
   *                 type: boolean
   *                 description: 매입가 숨김(F009 FR-27)
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
   *     description: |
   *       쿼리가 없으면 최신 AI 코치를 조회하고, symbol/mode/preview 쿼리가 있으면 선택 종목의 단타/장기 판단을 조회합니다.
   *
   *       국내 주식 6자리 코드(F011 슬라이스 4):
   *       - 로그인한 누구나(`ADR-011` — 2026-11-10 전에는 소유자만)
   *       - 단타 · 장기 둘 다 판단이 나간다(`ADR-010` v2 — 국내 단타 개방). mode 를 안 주면 장기
   *       - 일봉 120 거래일 · 일봉 지표 전엔 꼬리표 `insufficient_history { have, need, dailyIndicator }` + `history { dailyBars, requiredDailyBars, dailyIndicator, ready }`
   *       - `modes.*.assetClass: kr_stock` · `signalType: kr_stock.long_term.<action>` — 성적은 국내 주식 표본만
   *       - 재료가 1 거래일 넘게 밀렸으면 꼬리표 `stale_inputs`(코인은 시세 30분 · 지표 봉 기준)
   *
   *       **모드 판단은 늘 나간다**(`ADR-010` v2 · `SRV-REQ-053` FR-1 · 2) — `renderable` · `blockedReason` 없음. 판정 · `observations[]`(엔진이 본 값 · 문턱 · 거리,
   *       문턱에 가까운 순) · `trackRecord`(`sampleOrigin` live | backtest — 라이브가 모자라면 과거 검산으로 채움, 숫자 안 섞음) · `failureCases` + `caveats[]`:
   *       `insufficient_history` · `exchange_warning { cautions, checkedAt }` · `stale_inputs { items[{ item, lastAt }] }` · `live_sample_short { live, min, backtest }` ·
   *       결함(3종을 다 채우지 못함) `inputs_missing { items }` · `track_record_unavailable` · `backtest_missing { live, min }`
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
