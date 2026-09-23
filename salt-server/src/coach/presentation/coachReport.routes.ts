import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { CoachUseCases } from "../application/api";
import { CoachToolsController } from "./coachTools.controller";

/**
 * 코치 리포트 경로 — `/api/coach/*` (`SRV-REQ-025` 신규 표).
 *
 * `ddd-presentation.md` §7 이 말하는 **컨텍스트 이름이 곧 리소스 경로**인 자리다.
 * 기존 코치 경로(`/api/ai-coach` · `/api/signal-performance` …)는 이관 중 유지하고,
 * 신규 경로만 여기로 온다.
 */
export const createCoachReportRouter = (useCases: CoachUseCases): Router => {
  const router = Router();
  const controller = new CoachToolsController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/coach/scoreboard:
   *   get:
   *     summary: 판단 성적표 (신호 유형별)
   *     description: |
   *       종목 판단 스냅샷 중 **관찰 기간이 끝나 판정된 표본**을 신호 유형(`<mode>.<action>`)별로
   *       모아 준다. 그룹마다 표본 수 · 승률 · 평균 수익률 · 최대 낙폭과 관찰 기간 수익률 분포
   *       (구간 6개 + 하위 25% · 중앙값 · 상위 25%), 맞았던 때 · 틀렸던 때를 각각 최대 3건 싣는다.
   *
   *       - 표본은 종목 단위 판단이라 **사용자별로 다르지 않다.** 인증만 필요하다
   *       - `sample < 20` 이면 `lowSample: true` 다. 임계 판정은 서버가 한다
   *       - `returnDistribution.horizonDays` 는 그룹의 관찰 기간이다(단타 1 · 장기 30)
   *       - 과거 분포이고 **예측이 아니다.** 목표가 · 수익률 예측 필드는 없다
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: |
   *           성적표. 판정된 표본이 하나도 없으면 `status: insufficient_data` 이고 `groups` 가 빈다.
   *       401:
   *         description: 인증 실패
   */
  router.get("/scoreboard", controller.getScoreboard);

  /**
   * @swagger
   * /api/coach/detail:
   *   get:
   *     summary: 코치 상세 (추천 + 성적 + 익절 계획 + 행동 기록)
   *     description: |
   *       **저장된 마지막 추천**을 화면 계약으로 조립한다. 새로 생성하지 않는다(`POST /api/ai-coach/generate`).
   *
   *       - 추천에는 `renderable` · `blockedReason` 이 **항상** 있다. 근거 · 과거 적중률 · 실패사례 중
   *         하나라도 없으면 `renderable: false` 이고 **여전히 200** 이다. 우회 플래그는 없다
   *       - `signalTrackRecord` 는 같은 행동(`coach.<action>`)의 저장 추천 성적이다. 표본 0 이면
   *         `sample: 0` · `winRate: null` 이고 게이트가 막는다. 1~19 는 통과하고 `lowSample: true`
   *       - 실패사례 출처(지표 실패 이력)가 아직 없어 `failureCases` 는 빈 배열이고
   *         추천 블록은 `failure_cases_missing` 으로 막힌다 — 의도한 상태다
   *       - `staleHours` 는 생성 후 지난 시간(내림 정수). 추천이 없으면 `recommendation` 과 함께 `null`
   *       - `behaviorFacts` 와 `trendHold.conditionCode` 는 **코드**다. 문장은 프론트가 만든다
   *       - `excluded` 에 국내 주식 제외 사실이 늘 있다
   *       - 가격선은 보유자의 규칙이 가리키는 값이고 **목표가 · 수익률 예측이 아니다**
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 코치 상세
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   required: [recommendation, exitPlans, behaviorFacts, excluded, disclaimer]
   *                   properties:
   *                     generatedAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     staleHours:
   *                       type: integer
   *                       nullable: true
   *                     regime:
   *                       type: string
   *                       nullable: true
   *                       enum: [bullish, bearish, panic, euphoric, sideways]
   *                     recommendation:
   *                       type: object
   *                       nullable: true
   *                       required: [renderable, blockedReason, scoreNote]
   *                       properties:
   *                         action:
   *                           type: string
   *                           enum: [buy, sell, hold, rebalance]
   *                         symbol:
   *                           type: string
   *                         assetType:
   *                           type: string
   *                           enum: [crypto, us_stock]
   *                         score:
   *                           type: number
   *                         scoreNote:
   *                           type: string
   *                         renderable:
   *                           type: boolean
   *                         blockedReason:
   *                           type: string
   *                           nullable: true
   *                           enum: [reasons_missing, signal_track_record_missing, failure_cases_missing]
   *                         reasons:
   *                           type: array
   *                           items:
   *                             type: object
   *                         topFactors:
   *                           type: array
   *                           items:
   *                             type: object
   *                         signalTrackRecord:
   *                           type: object
   *                           nullable: true
   *                           properties:
   *                             signalType:
   *                               type: string
   *                               example: coach.buy
   *                             sample:
   *                               type: integer
   *                             winRate:
   *                               type: number
   *                               nullable: true
   *                             avgReturn:
   *                               type: number
   *                               nullable: true
   *                             maxDrawdown:
   *                               type: number
   *                               nullable: true
   *                             lowSample:
   *                               type: boolean
   *                         failureCases:
   *                           type: array
   *                           items:
   *                             type: object
   *                         explanation:
   *                           type: object
   *                           properties:
   *                             text:
   *                               type: string
   *                             source:
   *                               type: string
   *                               enum: [llm, rule]
   *                     risks:
   *                       type: array
   *                       items:
   *                         type: object
   *                     candidates:
   *                       type: array
   *                       description: 상위 3. `reasons` 는 아직 저장되지 않아 빈 배열이다
   *                       items:
   *                         type: object
   *                     exitPlans:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           symbol:
   *                             type: string
   *                           assetType:
   *                             type: string
   *                             enum: [crypto, us_stock]
   *                           currentPrice:
   *                             type: number
   *                           stopLoss:
   *                             type: object
   *                             properties:
   *                               price:
   *                                 type: number
   *                               priceGap:
   *                                 type: number
   *                           firstTakeProfit:
   *                             type: object
   *                             properties:
   *                               price:
   *                                 type: number
   *                               priceGap:
   *                                 type: number
   *                           trendHold:
   *                             type: object
   *                             properties:
   *                               conditionCode:
   *                                 type: string
   *                                 example: hold_or_trail_stop
   *                     behaviorFacts:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           factCode:
   *                             type: string
   *                             enum: [over_trading, panic_sell, chasing_high]
   *                           params:
   *                             type: object
   *                             additionalProperties:
   *                               type: number
   *                           amountKrw:
   *                             type: integer
   *                             nullable: true
   *                     excluded:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           assetType:
   *                             type: string
   *                             example: kr_stock
   *                           reasonCode:
   *                             type: string
   *                             example: no_realtime_data
   *                     disclaimer:
   *                       type: string
   *       401:
   *         description: 인증 실패
   */
  router.get("/detail", controller.getCoachDetail);

  /**
   * @swagger
   * /api/coach/generation-status:
   *   get:
   *     summary: 코치 생성 상태 · 남은 쿨다운
   *     description: |
   *       마지막 성공 생성 시각 · 마지막 요청 상태 · 진행 중 여부 · 수동 재생성까지 남은 초.
   *       화면이 재생성 버튼을 언제 열지 이것으로 정한다.
   *
   *       - `retryAfterSeconds` 가 0 이면 지금 누를 수 있다
   *       - 쿨다운 거부 요청은 `lastRequest` 로 보이지 않는다
   *       - 10분 넘게 끝나지 않은 생성은 진행 중으로 보지 않는다(도중에 프로세스가 죽은 경우)
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 생성 상태
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
   *                     lastGeneratedAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     lastRequest:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         requestedAt:
   *                           type: string
   *                           format: date-time
   *                         source:
   *                           type: string
   *                           enum: [worker, manual]
   *                         status:
   *                           type: string
   *                           enum: [running, succeeded, failed]
   *                     inProgress:
   *                       type: boolean
   *                     cooldownSeconds:
   *                       type: integer
   *                       example: 300
   *                     retryAfterSeconds:
   *                       type: integer
   *                       example: 0
   *       401:
   *         description: 인증 실패
   */
  router.get("/generation-status", controller.getGenerationStatus);

  return router;
};
