import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { CoachUseCases } from "../application/api";
import { CoachRiskController } from "./coachRisk.controller";
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
  const risk = new CoachRiskController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/coach/scoreboard:
   *   get:
   *     summary: 판단 성적표 (신호 유형별)
   *     description: |
   *       종목 판단 스냅샷 중 **관찰 기간이 끝나 판정된 표본**을 신호 유형(`<mode>.<action>`)별로
   *       모아 준다. 그룹마다 표본 수 · 승률 · 평균 수익률 · 가장 나빴던 수익률과 관찰 기간 수익률 분포
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
   * /api/coach/forecast:
   *   get:
   *     summary: 가격 변동 범위 (소유자 전용) — F008
   *     description: |
   *       `salt-forecast` 가 채점한 기간별(1 · 2 · 3 · 4주) **90% 가격 범위**와 보유 기준 평가금액 변화 범위.
   *
   *       - **소유자 계정만.** 아니면 404 — 존재 자체를 알리지 않는다(`ADR-003`)
   *       - 기간마다 `renderable` · `blockedReason` 이 **항상** 있다. 채점 이력 · 기준 대비 · 빗나간 사례 중
   *         하나라도 없으면 범위를 싣지 않는다(`failure_cases_missing` 등). 여전히 200
   *       - `trackRecord.kind` 가 `backtest` 면 화면은 "백테스트" 라벨을 붙인다(라이브 52주 전)
   *       - 커버리지는 폭 · 기준 폭과 **한 묶음**이다. 방향(`direction`)은 기준을 이긴 기간에만 있다
   *       - 한 점 목표가 · 명령형 매매 지시 필드는 없다
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: BTC }
   *     responses:
   *       200:
   *         description: 기간 4개. 막힌 기간은 범위 없이 사유만
   *       400:
   *         description: 심볼 형식 오류
   *       401:
   *         description: 인증 실패
   *       404:
   *         description: 소유자가 아니다
   */
  router.get("/forecast", controller.getForecast);

  /**
   * @swagger
   * /api/coach/events:
   *   get:
   *     summary: 다가오는 주요 사건(거시 일정)과 과거 반응 (소유자 전용) — F008 슬라이스 22
   *     description: |
   *       FOMC · CPI · 고용보고서 중 앞으로 35일 안의 일정과, 과거 같은 일정 뒤 1 · 5 · 20일 수익률 분포(워크포워드).
   *
   *       - **소유자 계정만.** 아니면 404(`ADR-003`)
   *       - 기간마다 `renderable`. 표본 · 분포와 평소 분포 · 빗나간 때 중 하나라도 없으면 분포 없이 사유만
   *       - 호재 · 악재 판정 필드는 없다 — 예상 대비 서프라이즈 데이터가 없다
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: BTC }
   *     responses:
   *       200: { description: 일정 목록. 없으면 빈 배열 }
   *       400: { description: 심볼 형식 오류 }
   *       401: { description: 인증 실패 }
   *       404: { description: 소유자가 아니다 }
   */
  router.get("/events", controller.getEvents);

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
   *                             worstObservedReturn:
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

  /**
   * @swagger
   * /api/coach/size-check:
   *   post:
   *     summary: 포지션 사이즈 계산 (F009 FR-4~8)
   *     description: |
   *       수량 · 단가 · 손절가로 **이 크기가 내 예산에서 몇 %인지**를 계산한다. 금액은 서버 Decimal, 응답 직전 원 정수.
   *
   *       - 계산만 한다. 차단 · 게이트 · 주문 없음(`orderExecution: false`). 지시 문구 없음 — 참고 수량 · 참고 비중은 숫자만
   *       - 못 구한 값은 `null` 이고 `unavailable.<필드>` 에 사유가 있다: `stop_price_missing` · `stop_not_below_entry` ·
   *         `budget_not_set` · `no_portfolio_value` · `monthly_budget_exhausted` · `insufficient_data` · `not_applicable_sell`.
   *         0 이나 기본값으로 채우지 않는다
   *       - 최대 손실 = 수량 × ((단가 − 손절가) + (단가 + 손절가) × 수수료율). 갭(손절가 아래 체결)은 가정하지 않는다(`assumptions`)
   *       - `referenceMaxQuantity` = min(1회 예산 ÷ 단위 손실, 한 종목 상한 수량). 가용 현금은 모른다(수동 입력 · 현금 기록 없음)
   *       - `volTargetWeight` = 목표 변동성 ÷ 실현 변동성(최대 1). 실현 변동성은 F009 슬라이스 2 전까지 없다 → `insufficient_data`
   *       - `winRate` · `payoffRatio` 를 함께 보내면 `kelly`(풀 · 1/2 · 1/4)가 붙는다. 음수면 `hasEdge: false`
   *       - 비율은 소수(0.28 = 28%). 예산 · 비중은 코인 보유 평가금액 합 기준
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [symbol, side, quantity, price]
   *             properties:
   *               symbol: { type: string, example: BTC }
   *               side: { type: string, enum: [buy, sell] }
   *               quantity: { type: number, exclusiveMinimum: 0, example: 0.01 }
   *               price: { type: number, exclusiveMinimum: 0, description: 원 }
   *               stopPrice: { type: number, exclusiveMinimum: 0, description: 원. 없으면 손실 계열이 unavailable }
   *               winRate: { type: number, exclusiveMinimum: 0, exclusiveMaximum: 1, description: payoffRatio 와 함께 }
   *               payoffRatio: { type: number, exclusiveMinimum: 0, description: winRate 와 함께 }
   *     responses:
   *       200:
   *         description: |
   *           `{ symbol, side, status(ok|stop_not_below_entry|sell_side), maxLossKrw, lossPerUnitKrw, perTradeBudgetRate,
   *           monthlyBudgetRemainingRate, monthlyBudgetRemainingKrw, referenceMaxQuantity{value,limitedBy}, volTargetWeight,
   *           currentWeight, projectedWeight, consecutiveLoss{count,amountKrw,monthlyBudgetRate}, kelly, unavailable,
   *           assumptions, volatilityAsOf, asOf, orderExecution }`
   *       400: { description: 요청 검증 실패(음수 · NaN · 무한대 · 승률만 보냄) }
   *       401: { description: 인증 실패 }
   */
  router.post("/size-check", risk.checkTradeSize);

  /**
   * @swagger
   * /api/coach/risk-budget:
   *   get:
   *     summary: 리스크 예산 · 게이지 3종 (F009 FR-1~3 · FR-17 · FR-23~24)
   *     description: |
   *       사용자가 정한 예산(월 허용 손실 · 1회 최대 손실 · 목표 변동성)과 게이지 셋.
   *
   *       - `drawdown` — 이번 달(KST) 시가 평가 손익이 월 예산의 몇 % 인지. 월초 종가가 없는 월초 보유 종목이 있으면
   *         `insufficient_data` + `missingCloses`. 예산이 없으면 `budget_not_set`(손익은 준다)
   *       - `concentration` — 가장 큰 종목 비중 vs 한 종목 상한(종목 집중도. 자산군 쏠림이 아니다)
   *       - `turnover` — 최근 365일 (매수 + 매도 대금) ÷ 2 ÷ 지금 평가금액, 올해 수수료. 기간 환산하지 않는다
   *       - 예산을 넘어도 막지 않는다 — `status: exceeded` 뿐. 예산이 없으면 0 이 아니라 `null`
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200: { description: "`{ settings, totalValueKrw, gauges{drawdown,concentration,turnover}, monthStart, asOf }`" }
   *       401: { description: 인증 실패 }
   *   put:
   *     summary: 리스크 예산 수정
   *     description: 빠진 필드는 그대로, `null` 은 지운다(다시 "기준을 정하면 보여요"). 응답은 GET 과 같다
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               monthlyLossBudget:
   *                 type: object
   *                 nullable: true
   *                 required: [amount, unit]
   *                 properties:
   *                   amount: { type: number, exclusiveMinimum: 0, description: krw 면 원, percent 면 0~1 비율 }
   *                   unit: { type: string, enum: [krw, percent] }
   *               perTradeMaxLoss:
   *                 type: object
   *                 nullable: true
   *                 required: [amount, unit]
   *                 properties:
   *                   amount: { type: number, exclusiveMinimum: 0 }
   *                   unit: { type: string, enum: [krw, percent] }
   *               targetVolatility: { type: number, nullable: true, exclusiveMinimum: 0, maximum: 2, description: "연 비율(0.15 = 15%). null 이면 기본 15%" }
   *     responses:
   *       200: { description: GET 과 같은 응답 }
   *       400: { description: 요청 검증 실패 }
   *       401: { description: 인증 실패 }
   */
  router.get("/risk-budget", risk.getRiskBudget);
  router.put("/risk-budget", risk.updateRiskBudget);

  /**
   * @swagger
   * /api/coach/plans:
   *   get:
   *     summary: 내 거래 계획 목록 (F009 FR-9)
   *     description: 최신 계획이 앞. 본인 것만
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         schema: { type: string, example: BTC }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
   *     responses:
   *       200: { description: "`{ plans: TradePlan[] }`" }
   *       401: { description: 인증 실패 }
   *   post:
   *     summary: 거래 계획 적기 (F009 FR-9~10)
   *     description: |
   *       종목 · 방향 말고는 전부 선택이다. `transactionId` 를 주면 그 거래(본인 · 같은 종목 · 같은 방향)에 연결한다.
   *       연결된 계획은 `stopPrice` · `plannedQuantity` · `probabilityUp` 을 바꿀 수 없다(`locked: true`)
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [symbol, side]
   *             properties:
   *               symbol: { type: string, example: BTC }
   *               side: { type: string, enum: [buy, sell] }
   *               transactionId: { type: string, format: uuid }
   *               stopPrice: { type: number, exclusiveMinimum: 0 }
   *               targetPrice: { type: number, exclusiveMinimum: 0 }
   *               plannedQuantity: { type: number, exclusiveMinimum: 0 }
   *               thesis: { type: string, maxLength: 200, description: 한 줄 이유 }
   *               invalidation: { type: string, maxLength: 200, description: 무효화 조건 한 줄 }
   *               reviewAt: { type: string, format: date-time }
   *               probabilityUp: { type: number, minimum: 0, maximum: 1, description: 사용자가 적는 오를 확률 }
   *     responses:
   *       201: { description: 만든 계획 }
   *       400: { description: 요청 검증 실패 · 거래와 종목/방향 불일치(`COACH_TRADE_PLAN_TRANSACTION_SYMBOL` · `_SIDE`) }
   *       401: { description: 인증 실패 }
   *       404: { description: 연결할 거래가 없다(`COACH_TRADE_PLAN_TRANSACTION_NOT_FOUND`) }
   */
  router.get("/plans", risk.listTradePlans);
  router.post("/plans", risk.createTradePlan);

  /**
   * @swagger
   * /api/coach/plans/{id}:
   *   patch:
   *     summary: 거래 계획 고치기 · 거래 연결
   *     description: |
   *       빠진 필드는 그대로, `null` 은 지운다. 계획은 지우지 않는다 — 잘못 적었으면 새로 적는다.
   *       - 거래 연결은 한 번뿐이다(`409 COACH_TRADE_PLAN_ALREADY_LINKED`)
   *       - 연결된 계획의 손절가 · 계획 수량 · 오를 확률을 **다른 값으로** 바꾸면 `409 COACH_TRADE_PLAN_LOCKED`
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               transactionId: { type: string, format: uuid }
   *               stopPrice: { type: number, nullable: true }
   *               targetPrice: { type: number, nullable: true }
   *               plannedQuantity: { type: number, nullable: true }
   *               thesis: { type: string, nullable: true, maxLength: 200 }
   *               invalidation: { type: string, nullable: true, maxLength: 200 }
   *               reviewAt: { type: string, format: date-time, nullable: true }
   *               probabilityUp: { type: number, nullable: true, minimum: 0, maximum: 1 }
   *     responses:
   *       200: { description: 고친 계획 }
   *       400: { description: 요청 검증 실패 · 거래 불일치 }
   *       401: { description: 인증 실패 }
   *       404: { description: 계획이 없다(남의 것 포함) }
   *       409: { description: 잠김 · 이미 연결됨 }
   */
  router.patch("/plans/:id", risk.updateTradePlan);

  return router;
};
