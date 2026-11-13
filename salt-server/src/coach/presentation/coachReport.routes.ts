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
   *       - 그룹마다 `assetClass`(`crypto` · `kr_stock`). 국내 주식 그룹 키는 `kr_stock.<mode>.<action>` 이고 국내 주식
   *         표본만 센다 — 합산 숫자는 없다(F011 FR-61 · 65). **국내 주식 그룹은 소유자에게만** 온다(시세 경로와 같은 판정)
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
   * /api/coach/check:
   *   get:
   *     summary: 사기 전 · 팔기 전 점검 — 맨 위 쉬운 한 줄 (F017 v2)
   *     description: |
   *       지금 시세가 사전등록 조건(`base-rate@1` — 국내 K1~K8 · 코인 C1~C8 중 일봉 조건)에 맞는지 보고, 그 조건에서 과거에
   *       가격이 어떻게 움직였는지 **분포**로 준다. 예측이 아니다 — 목표가 · 매매 지시 필드는 없다.
   *
   *       - `summary` 는 서버가 실제 숫자로 만든 한 문장이다(조건 · 기간 · 시장 단위가 같은 문장에). BFF · 화면은 고치지 않는다
   *       - `status`: `ok` · `below_min`(유효 표본 < 100 또는 서로 다른 날 < 60 — 비율 없음) · `no_condition`(맞는 조건 없음 —
   *         `conditionReason` 이 이유, 숫자는 평소 값)
   *       - 사기 전 비율은 **비용 뒤**(국내 수수료 · 그날 거래세 · 반 틱, 코인 0.15%), 팔기 전 보유 연장은 비용 전
   *       - `differsFromUsual` 은 예측이 Holm 보정을 통과시킨 조건만. 서술 조건(RSI 류)은 늘 `null`
   *       - `side=sell` 이고 보유가 있으면 `holding.realizedPct`(지금 팔면 확정되는 수익률 %) — 요약 문장에는 넣지 않는다
   *       - 사용자마다 다른 것은 `holding` 뿐 — 나머지는 종목 단위다. 점검마다 원장에 한 줄(사용자 열 없음, 나중 채점)
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: "BTC" }
   *         description: 코인 심볼(`BTC`) 또는 국내 종목 코드(`005930`)
   *       - in: query
   *         name: side
   *         required: false
   *         schema: { type: string, enum: [buy, sell], default: buy }
   *     responses:
   *       200:
   *         description: 점검. 예측 배치가 없는 DB 여도 200(`no_condition` · `not_covered`)
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
   *                     market: { type: string, enum: [kr, crypto] }
   *                     side: { type: string, enum: [buy, sell] }
   *                     status: { type: string, enum: [ok, below_min, no_condition] }
   *                     summary: { type: string }
   *                     conditionReason: { type: string, nullable: true, enum: [none_matched, stale_reference, not_covered] }
   *                     condition:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         id: { type: string }
   *                         phrase: { type: string }
   *                         describeOnly: { type: boolean }
   *                     alsoMatched: { type: array, items: { type: object, properties: { id: { type: string }, phrase: { type: string } } } }
   *                     horizon: { type: integer }
   *                     horizonLabel: { type: string }
   *                     sample: { type: integer, nullable: true }
   *                     sampleDays: { type: integer, nullable: true }
   *                     sampleEffective: { type: integer, nullable: true }
   *                     upRate: { type: number, nullable: true, description: "0~1" }
   *                     upRange: { type: object, nullable: true, properties: { low: { type: number }, high: { type: number } } }
   *                     differsFromUsual: { type: string, nullable: true, enum: [higher, lower] }
   *                     recentDiffers: { type: boolean, nullable: true }
   *                     usual: { type: object, nullable: true }
   *                     distributions: { type: array, items: { type: object } }
   *                     holding: { type: object, nullable: true, properties: { realizedPct: { type: number } } }
   *                     reference: { type: object }
   *                     disclaimer: { type: string }
   *       400:
   *         description: symbol · side 형식 오류
   *       401:
   *         description: 인증 실패
   */
  router.get("/check", controller.getTradeCheck);

  /**
   * @swagger
   * /api/coach/scenario:
   *   get:
   *     summary: 시나리오 — 모든 종목 · 지평 넷(1시간 · 4시간 · 1일 · 5일)에 늘 — F017 v4 (`SRV-REQ-053` FR-10)
   *     description: |
   *       로그인한 누구나. 지평은 **늘 넷**이고 칸이 비지 않는다. 칸마다 `source`:
   *
   *       - `base_rate` — **과거 실제 결과**(사전등록 `base-rate@1`, 점검 한 줄과 같은 뷰 · 같은 조건 판정). 예측이 아니다.
   *         숫자는 가격이 실제로 움직인 분포(비용 전): `upCount100`(100번 중 오른 횟수) · `upRange`(Wilson 95%) · `range`(기준 가격 대비 %) ·
   *         `invalidation`(지금 가격 × 나빴던 10%)
   *       - `model` — 모델 확률(`short-direction@3`). **소유자 + 시험을 넘은 칸만**(`ADR-003`). 소유자가 아니면 `model` 은 늘 `null`
   *       - `tier` 어느 단을 썼나: `now`(지금 성립한 조건 · 유효 n ≥ 100) → `usual`(그 시장 평소) → `longer`(한 단계 긴 지평 —
   *         `fallbackFrom` 에 빌려 온 지평. 장중 1h · 4h 기저율은 아직 없어 하루 값) → `defect`("아직 n번뿐" — 비율 · 범위 `null`)
   *       - `differsFromUsual` 은 예측이 Holm 을 통과시킨 조건이고 이 숫자에서도 같은 쪽일 때만
   *       - 소유자에게는 막힌 모델 칸의 시험 상태(`model.blockedReason` · `model.track`)도 실린다
   *       - 한 점 목표가 · 매매 지시 필드는 없다
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: BTC }
   *         description: 코인 심볼(`BTC`) 또는 국내 종목 코드(`005930`)
   *     responses:
   *       200:
   *         description: 지평 넷
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
   *                     market: { type: string, enum: [crypto, kr] }
   *                     disclaimer: { type: string }
   *                     horizons:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           horizon: { type: string, enum: ["1h", "4h", "1d", "5d"] }
   *                           horizonLabel: { type: string }
   *                           source: { type: string, enum: [model, base_rate] }
   *                           tier: { type: string, enum: [now, usual, longer, defect] }
   *                           fallbackFrom: { type: string, nullable: true, enum: ["4h", "1d", "5d"] }
   *                           baseRate:
   *                             type: object
   *                             nullable: true
   *                             description: "`source: base_rate` 일 때 늘"
   *                             properties:
   *                               condition: { type: object, nullable: true, properties: { id: { type: string }, phrase: { type: string } } }
   *                               status: { type: string, enum: [ok, below_min] }
   *                               sample: { type: integer }
   *                               sampleEffective: { type: integer }
   *                               sampleDays: { type: integer }
   *                               upCount100: { type: integer, nullable: true }
   *                               upRange: { type: object, nullable: true, properties: { low100: { type: integer }, high100: { type: integer } } }
   *                               range: { type: object, nullable: true, properties: { lowPct: { type: number }, midPct: { type: number }, highPct: { type: number } } }
   *                               usualUp100: { type: integer, nullable: true }
   *                               differsFromUsual: { type: string, nullable: true, enum: [higher, lower] }
   *                               refPrice: { type: number, nullable: true }
   *                               invalidation: { type: number, nullable: true }
   *                               asOf: { type: string, format: date-time, nullable: true }
   *                           model:
   *                             type: object
   *                             nullable: true
   *                             description: 소유자만 · 1h · 4h · 1d. 시험을 넘은 칸만 `renderable` 과 `pUp` · `range` · `invalidation`
   *                             properties:
   *                               renderable: { type: boolean }
   *                               blockedReason: { type: string, nullable: true }
   *                               pUp: { type: number, nullable: true, description: "0~1" }
   *                               range: { type: object, nullable: true, properties: { lowPct: { type: number }, midPct: { type: number }, highPct: { type: number } } }
   *                               invalidation: { type: number, nullable: true }
   *                               refPrice: { type: number, nullable: true }
   *                               asOf: { type: string, format: date-time, nullable: true }
   *                               expiresAt: { type: string, format: date-time, nullable: true }
   *                               track:
   *                                 type: object
   *                                 nullable: true
   *                                 properties:
   *                                   origin: { type: string, enum: [backtest, live] }
   *                                   calls: { type: integer }
   *                                   hits: { type: integer }
   *                                   alwaysUpHits: { type: integer }
   *                                   window: { type: object, nullable: true, properties: { from: { type: string }, to: { type: string } } }
   *                                   misses: { type: array, items: { type: object, properties: { asOf: { type: string }, symbol: { type: string }, pUp: { type: number }, realizedPct: { type: number } } } }
   *       400:
   *         description: 심볼 형식 오류
   *       401:
   *         description: 인증 실패
   */
  router.get("/scenario", controller.getScenario);

  /**
   * @swagger
   * /api/coach/panel:
   *   get:
   *     summary: 한 장 패널 한 번 응답 — 시나리오 · 점검 한 줄 · 원인 · 회사 사정 · 성적 · 해설 · 내 기준 — F017 v4 (`SRV-REQ-053` FR-13)
   *     description: |
   *       로그인한 누구나. 칸별 경로(`/api/coach/scenario` · `/api/coach/check` · `/api/ai-coach` · `/api/ai-coach/explanation` ·
   *       `…/why-moved`)와 **같은 유스케이스**를 한 번에 조립한다 — 새 계산 0, 저장값만(LLM · 외부 호출 0).
   *
   *       - 칸마다 `tier`(`now` 지금 조건 · 제 값 → `usual` 평소 · 이전 값 → `longer` 대신 채운 값 → `defect` 아직 말할 수 없음)와
   *         `status`(`ok` · `fallback` · `degraded`). **한 칸 실패가 패널을 비우지 않는다** — 그 칸만 `defect`, 응답은 200
   *       - `cells` 는 상태 점검(`OPS-004`)이 세는 칸 표(11줄 — 지평 넷 · 점검 · 원인 · 회사 사정 · 성적 둘 · 해설 둘)
   *       - `horizonMode` — 기간 탭 → 판단 모드(1h · 4h = 단타, 1d · 5d = 장기). 성적 · 해설 칸은 모드마다 `modes` 에
   *       - `company` 는 재료(공시 · 기사 추출 사실)가 순서 2 라 지금은 늘 `defect` + `reason: source_not_collected`
   *       - `mine` 은 보유가 있을 때만(아니면 null) · 토큰의 사용자 것만 · 매입가 숨김이면 평단 · 평가 손익 null.
   *         보유를 못 읽었으면 `status: degraded` + `view: null`(보유 없음으로 접지 않는다)
   *       - 모델 확률은 소유자 + 시험을 넘은 칸만(`/api/coach/scenario` 와 같다). 한 점 목표가 · 매매 지시 필드는 없다
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: BTC }
   *         description: 코인 심볼(`BTC`) 또는 국내 종목 코드(`005930`)
   *     responses:
   *       200:
   *         description: 패널 — 칸이 비지 않는다
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
   *                     market: { type: string, enum: [crypto, kr] }
   *                     generatedAt: { type: string, format: date-time }
   *                     horizonMode:
   *                       type: object
   *                       properties:
   *                         1h: { type: string, enum: [scalp, long_term] }
   *                         4h: { type: string, enum: [scalp, long_term] }
   *                         1d: { type: string, enum: [scalp, long_term] }
   *                         5d: { type: string, enum: [scalp, long_term] }
   *                     scenario:
   *                       type: object
   *                       description: "`horizons[]` 는 `/api/coach/scenario` 칸 + `status`"
   *                       properties:
   *                         horizons: { type: array, items: { type: object } }
   *                         disclaimer: { type: string }
   *                     verdict:
   *                       type: object
   *                       properties:
   *                         tier: { type: string, enum: [now, usual, longer, defect] }
   *                         status: { type: string, enum: [ok, fallback, degraded] }
   *                         check: { type: object, nullable: true, description: "`/api/coach/check?side=buy` 응답 그대로" }
   *                     cause:
   *                       type: object
   *                       properties:
   *                         tier: { type: string, enum: [now, usual, longer, defect] }
   *                         status: { type: string, enum: [ok, fallback, degraded] }
   *                         cause:
   *                           type: object
   *                           nullable: true
   *                           properties:
   *                             causes: { type: array, items: { type: object } }
   *                             result: { type: object, properties: { changeRate: { type: number }, text: { type: string }, past: { type: string, nullable: true } } }
   *                     company:
   *                       type: object
   *                       properties:
   *                         tier: { type: string, enum: [defect] }
   *                         status: { type: string, enum: [degraded] }
   *                         reason: { type: string, enum: [source_not_collected] }
   *                     modes:
   *                       type: object
   *                       description: "`scalp` · `longTerm` — 각 `{ mode, judgment, track{ tier, status, trackRecord, failureCases }, explanation{ tier, status, asOf, view } }`"
   *                     mine:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         status: { type: string, enum: [ok, degraded] }
   *                         view:
   *                           type: object
   *                           nullable: true
   *                           properties:
   *                             line: { type: object, nullable: true, properties: { kind: { type: string, enum: [stop, target] }, price: { type: number } } }
   *                             gapToLinePct: { type: number, nullable: true }
   *                             averageBuyPrice: { type: number, nullable: true }
   *                             unrealizedProfit: { type: number, nullable: true }
   *                             unrealizedProfitRate: { type: number, nullable: true }
   *                     cells:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           key: { type: string }
   *                           tier: { type: string, enum: [now, usual, longer, defect] }
   *                           status: { type: string, enum: [ok, fallback, degraded] }
   *       400:
   *         description: 심볼 형식 오류
   *       401:
   *         description: 인증 실패
   */
  router.get("/panel", controller.getPanel);

  /**
   * @swagger
   * /api/coach/explain/stream:
   *   get:
   *     summary: 해설 스트림(SSE) — 저장본이 있으면 한 번, 없으면 생성하며 검사를 지난 문장부터 — F017 v4 (`SRV-REQ-053` FR-9)
   *     description: |
   *       `text/event-stream`. 이벤트:
   *
   *       - `snapshot` — 지금 지문의 최신 AI 저장본(해설 4단 뷰 — `/api/ai-coach/explanation` 과 같은 모양). 이것으로 끝
   *       - `sentence` — 검사(사실 · 극성 · 칸 상한 · 되풀이)를 지난 문장 하나 `{ section, text, citations }`
   *       - `done` — 저장 끝 · 최종 한 벌(얼마나 믿을까 · 틀렸던 때 문장 포함)
   *       - `fallback` — 만들 수 없었다(하루 상한 · LLM 꺼짐 · 검사가 전부 버림 · 실패) — 서버 문장(이전 AI · 사실표 · 판단만)
   *       - `error` — 스트림 자체 실패 `{ code }`
   *       - `: ping` 주석 15초
   *
   *       같은 종목 · 모드 · 지문은 생성 하나에 여러 요청이 붙는다(배치도 같은 자리). 끊겨도 생성은 끝까지 가서 저장한다.
   *       문장은 모두에게 같다(시장 층 — 사람마다 다르지 않다)
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: BTC }
   *       - in: query
   *         name: mode
   *         required: true
   *         schema: { type: string, enum: [scalp, long_term] }
   *     responses:
   *       200:
   *         description: SSE 스트림
   *         content:
   *           text/event-stream:
   *             schema: { type: string }
   *       400:
   *         description: 심볼 · 모드 형식 오류
   *       401:
   *         description: 인증 실패
   */
  router.get("/explain/stream", controller.streamExplanation);

  /**
   * @swagger
   * /api/coach/events:
   *   get:
   *     summary: 다가오는 주요 사건(거시 · 국내 시장 일정)과 과거 반응 (소유자 전용) — F008 슬라이스 22 · 24
   *     description: |
   *       앞으로 35일 안의 일정과, 과거 같은 일정 뒤 1 · 5 · 20 일봉 수익률 분포(워크포워드).
   *
   *       - 코인(`BTC`): 미국 거시(`fomc` · `cpi` · `jobs`)만. 국내 종목(6자리 `005930`): 국내 4종
   *         (`kr_bok_rate` · `kr_cpi` · `kr_trade` · `kr_quad_expiry`) + 미국 거시 — 국내 거래일 기준(`SRV-REQ-041` FR-2)
   *       - 행마다 `scope`(`market` 시장 일정 · `symbol` 종목 사건 — 2단계) · `region`(`us` · `kr`). 종목 사건이 먼저, 같은 범위 안은 시각 순
   *       - **소유자 계정만.** 아니면 404(`ADR-003`)
   *       - 기간마다 `renderable`. 표본 · 분포와 평소 분포 · 빗나간 때 중 하나라도 없으면 분포 없이 사유만
   *       - 호재 · 악재 판정 필드는 없다 — 예상 대비 서프라이즈 데이터가 없다. 종류 이름은 코드 그대로(문장은 프론트)
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: "005930" }
   *         description: 코인 심볼(`BTC`) 또는 국내 종목 코드(6자리)
   *     responses:
   *       200:
   *         description: 일정 목록. 없으면 빈 배열
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     symbol: { type: string }
   *                     label: { type: string }
   *                     disclaimer: { type: string }
   *                     events:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           kind: { type: string, enum: [fomc, cpi, jobs, kr_bok_rate, kr_cpi, kr_trade, kr_quad_expiry] }
   *                           scope: { type: string, enum: [market, symbol] }
   *                           region: { type: string, enum: [us, kr] }
   *                           eventAt: { type: string, format: date-time }
   *                           announcedAt: { type: string, format: date-time }
   *                           source: { type: string }
   *                           horizons:
   *                             type: array
   *                             description: "1 · 5 · 20일. `renderable=false` 면 `blockedReason` 만"
   *                             items: { type: object }
   *       400: { description: 심볼 형식 오류 }
   *       401: { description: 인증 실패 }
   *       404: { description: 소유자가 아니다 }
   */
  router.get("/events", controller.getEvents);

  /**
   * @swagger
   * /api/coach/positioning:
   *   get:
   *     summary: 쏠림 신호 — 선물 펀딩비 · 김치 프리미엄과 과거 반응 (소유자 전용) — F008 슬라이스 23
   *     description: |
   *       바이낸스 펀딩비가 지난 1년 중 어디쯤인지(백분위) · 미결제약정 7일 변화 · 김치 프리미엄(ECB 원/달러)과,
   *       과거 같은 신호(쏠림 진입 · 0 교차 확정) 뒤 1 · 5 · 20일 수익률 분포(워크포워드).
   *
   *       - **소유자 계정만.** 아니면 404(`ADR-003`)
   *       - 상태는 관측값이다. 매매 신호 · 과열 판정 필드는 없다(`state` 는 백분위 구간 코드)
   *       - 반응 기간마다 `renderable`. 표본 · 분포와 평소 분포 · 빗나간 때 중 하나라도 없으면 분포 없이 사유만
   *       - 배치가 사흘 넘게 안 돌았으면 `blockedReason: stale_inputs` 이고 상태 · 반응이 비어 있다
   *     tags: [Coach Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: symbol
   *         required: true
   *         schema: { type: string, example: BTC }
   *     responses:
   *       200: { description: 상태 · 반응. 없는 칸은 null }
   *       400: { description: 심볼 형식 오류 }
   *       401: { description: 인증 실패 }
   *       404: { description: 소유자가 아니다 }
   */
  router.get("/positioning", controller.getPositioning);

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
   *                             enum: [insufficient_history, symbol_judgment_only]
   *                             description: 국내 주식은 종목 판단만 연다(F011 슬라이스 4) — 표본 20 전 insufficient_history
   *                           progress:
   *                             type: object
   *                             properties:
   *                               largestGroupSample:
   *                                 type: integer
   *                               requiredSample:
   *                                 type: integer
   *                                 example: 20
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
   *       - `gapScenarios`(국내 주식 매수 + 손절가, F011 `SRV-REQ-040` FR-45) — 손절가에서 안 팔렸을 때 두 줄을 최대 손실 옆에 나란히.
   *         `limitDown` = 손절가 바로 위에서 다음 날 하한가(−30%)로 열린 경우, `historicalGap` = 그 종목 최근 5년 밤사이 갭
   *         (시가 ÷ 전일 종가) 하위 1% 로 열린 경우(`worstGapRate` · `sample` · `since` 같이). 표본 250 미만이면 `historicalGap: null` ·
   *         `historicalGapUnavailable: insufficient_data`. 시가 ÷ 전일 종가가 0.69~1.31 밖인 날은 원천 끊김이라 세지 않는다.
   *         코인 · 매도 · 손절가 없음은 `gapScenarios: null`. `noteCode: stop_may_not_fill` — VI · 거래정지 · 연속 하한가엔 끝이 없다
   *       - `referenceMaxQuantity` = min(1회 예산 ÷ 단위 손실, 한 종목 상한 수량). 가용 현금은 모른다(수동 입력 · 현금 기록 없음)
   *       - `volTargetWeight` = 목표 변동성 ÷ 실현 변동성(최대 1). 실현 변동성은 F009 슬라이스 2 전까지 없다 → `insufficient_data`
   *       - `winRate` · `payoffRatio` 를 함께 보내면 `kelly`(풀 · 1/2 · 1/4)가 붙는다. 음수면 `hasEdge: false`
   *       - 비율은 소수(0.28 = 28%). 예산 · 비중은 코인 보유 평가금액 합 기준
   *       - `behavior`(FR-12) — 입력 중 행동 미리보기. 저장하지 않는다(판정은 배치). 이것만 실패하면 `null` 이고 나머지는 그대로다
   *         - 매수: `candidateTags`(이 거래가 저장되면 붙을 자동 태그 후보, 배치와 같은 규칙) · `edgeWarnings`(후보 중 표본 ≥ 20 ·
   *           기대값 음수인 태그 — 폼이 한 줄씩 보인다, 차단 아님) · `chasingUnknown`(5분봉이 없어 추격을 못 가림)
   *         - 매도: `sellFraming{planId, stopPrice, currentPrice}` — 아직 남은 매수에 연결된 최신 계획의 손절가 vs 지금.
   *           매입가 · 손익률은 싣지 않는다
   *         - 거래가 상한(5,000건)에 잘리면 `{ status: truncated }`
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
   *               hasPlan: { type: boolean, description: 폼에 계획(손절가 또는 이유)이 있는가 — 계획 외 후보 판정. 없으면 stopPrice 유무 }
   *     responses:
   *       200:
   *         description: |
   *           `{ symbol, side, status(ok|stop_not_below_entry|sell_side), maxLossKrw, lossPerUnitKrw, perTradeBudgetRate,
   *           monthlyBudgetRemainingRate, monthlyBudgetRemainingKrw, referenceMaxQuantity{value,limitedBy}, volTargetWeight,
   *           currentWeight, projectedWeight, consecutiveLoss{count,amountKrw,monthlyBudgetRate}, kelly, unavailable,
   *           gapScenarios{limitDown{gapRate,maxLossKrw}, historicalGap{quantile,gapRate,worstGapRate,sample,since,maxLossKrw}, historicalGapUnavailable, noteCode},
   *           assumptions, volatilityAsOf, behavior{status, candidateTags, chasingUnknown, edgeWarnings[], sellFraming, checklist{items[{tag, question, count, netPnlKrw}], premortemQuestion}}, asOf,
   *           orderExecution }`
   *       400: { description: 요청 검증 실패(음수 · NaN · 무한대 · 승률만 보냄) }
   *       401: { description: 인증 실패 }
   */
  router.post("/size-check", risk.checkTradeSize);

  /**
   * @swagger
   * /api/coach/risk-budget:
   *   get:
   *     summary: 리스크 예산 · 게이지 · 측정 (F009 FR-1~3 · FR-17 · FR-23~26)
   *     description: |
   *       사용자가 정한 예산(월 허용 손실 · 1회 최대 손실 · 목표 변동성)과 게이지 셋.
   *
   *       - `drawdown` — 이번 달(KST) 시가 평가 손익이 월 예산의 몇 % 인지. 월초 종가가 없는 월초 보유 종목이 있으면
   *         `insufficient_data` + `missingCloses`. 예산이 없으면 `budget_not_set`(손익은 준다)
   *       - `concentration` — 가장 큰 종목 비중 vs 한 종목 상한(종목 집중도. 자산군 쏠림이 아니다)
   *       - `turnover` — 최근 365일 (매수 + 매도 대금) ÷ 2 ÷ 지금 평가금액, 올해 수수료. 기간 환산하지 않는다
   *       - `btcBeta`(F010 슬라이스 2) — Σ(평가금 비중 × 90일 BTC 베타). 베타가 없는 종목은 합에서 빼고
   *         `coveredWeight` · `missingSymbols` 로 알린다. `btcEquivalentKrw` 는 BTC 로 환산한 노출. 예산이 없어 `exceeded` 없음
   *       - `portfolioVolatility`(F011 FR-46) — 보유 합산 변동성(연) 범위: `upper` 상관 1 가정(종목 변동성 가중 합) ·
   *         `realized` 최근 250 축 날짜 실현 공분산. 국내 주식을 들고 있으면 KRX 거래일 축(코인은 그날 09:00 KST 종가로 as-of 정렬,
   *         주말 변동은 다음 거래일에) · √252, 아니면 달력일 · √365. `crossCorrelation` 코인 몫 · 국내 몫 수익률 상관. 수익률 60 미만이면
   *         `insufficient_data`. 판정 없음
   *         - `contributions[]`(FEATURE-009 FR-26) — 종목별 흔들림 몫 `{symbol, assetType, name, logoUrl, weight, share}`, 몫 큰 순.
   *           `share` = wᵢ(Σw)ᵢ ÷ wᵀΣw(오일러 분해, 합 1, 음수면 전체 흔들림을 줄였다). `name` · `logoUrl` 은 국내 종목만(코인 `null`)
   *         - `tail`(FR-26) — 같은 창에서 지금 비중을 날마다 얹은 보유 하루 수익률 중 가장 나빴던 5%(올림)의 평균(과거 CVaR 95%)
   *           `{fraction, days, averageRate, averageKrw, worstRate, worstOn}`. 금액은 값을 낸 보유의 지금 평가금 기준(음수). **확률 필드가 없다**.
   *           값을 못 내면 `contributions: []` · `tail: null`
   *       - `market`(F010 슬라이스 2) — BTC 200일선 위 여부 · HMM 고변동 확률 · 365일 낙폭 · 다음 FOMC/CPI. 사전등록
   *         `regime-gate@1` 판정이 게이트 · 이벤트 축소를 채택하지 않아 `gate.key: null` · `gate.open: true` · `eventFactor: 1`
   *         (아무것도 막거나 줄이지 않는다). 국면 작업이 없거나 3일 넘었으면 `null`
   *       - 예산을 넘어도 막지 않는다 — `status: exceeded` 뿐. 예산이 없으면 0 이 아니라 `null`
   *       - `scenarios`(FR-25) — 지금 코인 보유가 −10 · −30 · −50% 면 손실(원, 음수)과 종목별 몫, 과거 구간(2022-11 FTX)
   *         수익률을 지금 보유에 다시 얹은 손실. **확률 필드가 없다.** 그 구간에 일봉이 없는 종목이 있으면 그 구간만
   *         `insufficient_data` + `missingSymbols`
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200: { description: "`{ settings{…, maxSingleAssetWeight, investableCapitalKrw}, totalValueKrw, gauges{drawdown,concentration,turnover,btcBeta,portfolioVolatility}, market, scenarios{status, totalValueKrw, shocks[], episodes[]}, monthStart, asOf }`" }
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
   *               maxSingleAssetWeight: { type: number, nullable: true, minimum: 0.05, maximum: 1, description: "한 종목 상한 비율(0.6 = 60%). null 이면 기본 60%" }
   *               investableCapital: { type: number, nullable: true, exclusiveMinimum: 0, maximum: 1000000000000, description: "투자금(현금 포함, 원) — 목표 비중 안내의 전체(F010 슬라이스 5). null 이면 지운다" }
   *     responses:
   *       200: { description: GET 과 같은 응답 }
   *       400: { description: 요청 검증 실패 }
   *       401: { description: 인증 실패 }
   */
  router.get("/risk-budget", risk.getRiskBudget);
  router.put("/risk-budget", risk.updateRiskBudget);

  /**
   * @swagger
   * /api/coach/target-weights:
   *   get:
   *     summary: 목표 비중 안내 — 확률 없음 (F010 슬라이스 5)
   *     description: |
   *       보유 종목 + BTC · ETH 를 **변동성만으로** 나눈 목표 비중과 지금 비중의 차(원 · 수량). 방향 판단 · 확률 · 기대 R 이 없다.
   *       규칙(사전등록 `target-weight@1`): 역변동성 배분 → 노출 = min(1, 목표 σ ÷ 묶음 σ(상관 1)) → 한 종목 상한, 남는 몫은 현금.
   *
   *       - 전체 = 투자금(`PUT /api/coach/risk-budget` `investableCapital`). 없으면 코인 평가금 합(`basis: crypto_value`),
   *         투자금이 보유보다 작으면 보유 합(`capitalBelowHoldings: true`). 둘 다 없으면 `status: no_capital`
   *       - `status` — `under` 부족 · `over` 초과 · `at` 차가 최소 주문 금액(5,000원) 미만. **지시가 아니다** — 실행은 사용자
   *       - 무효화 3조건: `expiresAt`(다음 월요일 09:00 KST) · `sigmaBand`(σ ±25%) · `stopPriceKrw`(−1σ, 20일)
   *       - 3종 고지: 근거(종목 σ) · 과거 성적(`record` — 8년 업비트 주간 백테스트, 목표 σ 가 가장 가까운 등록값) ·
   *         실패 사례(`record.missedUpside` · `worstMonths`). `record.claims` 가 화면이 쓸 수 있는 문장을 정한다
   *       - σ 가 있는 종목이 없으면 `renderable: false` · `blockedReason: no_volatility`
   *       - 시세가 30분 넘게 멈췄거나 변동성 배치가 사흘 넘게 멈춰 비중이 안 나오면 `blockedReason: stale_inputs`(F010 슬라이스 7).
   *         30분 넘은 시세의 종목은 `excluded`(`price_unavailable`)로 빠진다
   *       - 주문하지 않는다(`orderExecution: false`)
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200: { description: "`{ status, basis, capitalKrw, capitalBelowHoldings, rows[], excluded[], totals, expiresAt, volatilityAsOf, targetVolatility, targetVolatilityIsDefault, maxSingleAssetWeight, record, backtest, renderable, blockedReason, asOf, orderExecution }`" }
   *       401: { description: 인증 실패 }
   */
  router.get("/target-weights", risk.getTargetWeights);

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
   *               checklist:
   *                 type: object
   *                 description: 진입 전 체크리스트 기록(FR-30) — 보인 질문 태그 · 체크한 태그. 기록만 하고 막지 않는다. 만든 뒤 고치지 않는다
   *                 required: [shown, checked]
   *                 properties:
   *                   shown: { type: array, maxItems: 5, items: { type: string, maxLength: 20 } }
   *                   checked: { type: array, maxItems: 5, items: { type: string, maxLength: 20 }, description: shown 안의 값만 }
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
   *               userAdherenceLabel:
   *                 type: string
   *                 nullable: true
   *                 enum: [honored, stop_not_honored, stop_slipped, size_exceeded]
   *                 description: 준수 판정 수정(F009 FR-11). 원본 판정은 남는다. null 이면 수정을 지운다. 잠금 대상이 아니다
   *     responses:
   *       200: { description: 고친 계획 }
   *       400: { description: 요청 검증 실패 · 거래 불일치 }
   *       401: { description: 인증 실패 }
   *       404: { description: 계획이 없다(남의 것 포함) }
   *       409: { description: 잠김 · 이미 연결됨 }
   */
  router.patch("/plans/:id", risk.updateTradePlan);

  /**
   * @swagger
   * /api/coach/mirror:
   *   get:
   *     summary: 내 거래 미러 (F009 FR-12 · FR-15~19)
   *     description: |
   *       본인 기록의 통계 — 지시 문구 없음. 각 지표는 `{ value, sampleSize, status }` 이고
   *       `status` 는 `ok` · `insufficient_sample`(표본 < 20, **값은 준다**) · `insufficient_data`(값 `null`).
   *
   *       - `adherence` — 판정 가능한 계획 중 위반 없는 비율 · 라벨별 수 · 준수/위반 청산 평균 순수익률(수수료 후).
   *         사용자가 고친 라벨이 있으면 그것을 센다
   *       - `disposition` — PGR · PLR(Odean 1998, 매도일 일봉 종가 기준) · 익절/손절 평균 보유일
   *       - `benchmark` — 실제 TWR vs 첫 거래일 구성을 그대로 들고 있었을 때. 차이 = 수수료 몫 + 나머지(타이밍 · 선택).
   *         순입금은 같은 날 같은 비중으로 샀다고 가정(`assumptions`)
   *       - `tagCosts` — 태그별 청산 수 · 손익 합(원) · 평균 수익률 · 평균 R. 표본 ≥ 20 에서 기대값이 음수면 `noEdge: true`.
   *         확정한 태그가 있으면 그것, 없으면 자동 후보
   *       - `turnover` — 최근 365일 회전율 · 올해 수수료 + 기준선(국내 주식 일 회전율, 출처 · 단위 포함. 환산하지 않는다)
   *       - 결과 · 라벨은 일 4회 배치가 만든다(`outcomesComputedAt`). 배치가 실패하면 직전 값이 그대로 보인다
   *       - 거래가 5,000건을 넘으면 `status: truncated` — 합을 만들지 않는다
   *       - `brier`(FR-13) — 계획에 적은 "오를 확률"을 `reviewAt`(없으면 30일) 뒤 방향으로 채점한 평균 Brier ·
   *         기준선 0.25(늘 50%) · 실력(1 − 평균 ÷ 기준선) · 빗나간 수 · 만기 전 수 · 최근 빗나간 3건. 기준 가격은 적기 전
   *         마지막 닫힌 일봉 종가다
   *       - `streak`(FR-20) — 지금 이어지는 연승/연패(`current`, 순손익 0 청산은 끊는다) · 최장 연승 · 연패 ·
   *         연속 3건 이상 뒤 매수 금액 평균 ÷ 그 밖의 평균(`afterWins` · `afterLosses`). `observed` 는 비율 ≥ 1.2 이고
   *         연속 뒤 매수 ≥ 20 일 때만 true. 거래가 잘리면(`truncated`) 사이즈 비교는 `null`
   *       - `timing`(FR-22) — 진입 시각(KST) 4구간 · 요일 7개별 청산 수 · 이익 비율 · 평균 순수익률 · 손익 합(원).
   *         날짜만 적은 진입(KST 0시 정각)은 시간대에서 빠지고(`untimedCount`), 하나도 없으면 `bands: null`
   *       - `lossAsymmetry`(F010 슬라이스 2) — 최근 20건 청산의 가장 큰 손실 ÷ 가장 큰 이익(순손익 원). 이익 · 손실 중
   *         하나라도 없으면 `ratio.value: null`. 판정 문구 없음 — 측정만
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: "`{ status, adherence, disposition, benchmark, tagCosts[], turnover, brier, streak, timing, lossAsymmetry, outcomeCount, outcomesComputedAt, minSample, asOf }`"
   *       401: { description: 인증 실패 }
   */
  router.get("/mirror", risk.getBehaviorMirror);

  /**
   * @swagger
   * /api/coach/mirror/kr-stock:
   *   get:
   *     summary: 내 국내 주식 거래 미러 (F011 FR-47)
   *     description: |
   *       국내 주식 거래만 — 코인 미러와 따로다. 창은 **거래일**이고, 순서는 국내 근거가 직접적인 순이다. 지표 모양은 코인 미러와 같은
   *       `{ value, sampleSize, status }`(표본 < 20 이면 `insufficient_sample`, 값은 준다). 지시 · 판정 문구 없음.
   *
   *       - `turnover` — 최근 250거래일 일 회전율 = (매수 + 매도 대금) ÷ 2 ÷ 보유한 거래일 종가 평가금 합. 기준선은 코인 미러와 같은
   *         국내 일 회전율(KCMI 2020)
   *       - `disposition` — PGR · PLR(매도일 종가, 휴장일 매도는 직전 거래일 종가) · 익절/손절 평균 **보유 거래일**
   *       - `nextDaySell` — 매수 다음 거래일에 이익이던 매수 중 그날 판 비율 · 손실이던 매수 중 그날 판 비율 + 기준점(KCMI 41% · 22%,
   *         정의 원문 미확인)
   *       - `chase` — 매수 직전 40거래일 종가 상승률 평균 · 중앙값 + 기준점(KCMI 매수 전 40일 평균 25.8%, 2020-03~10).
   *         봉 41개 미만 · 원천 끊김(종가 비율 0.69~1.31 밖)은 표본이 아니다
   *       - `lottery` — 최근 365일 매수 대금 중 복권형 종목 몫(Kumar 2009 를 총변동으로: 지난달 말까지 6개월 주가 < 중앙값 ·
   *         변동성 > 중앙값 · 왜도 > 중앙값, 국내 전 종목 단면) + 같은 단면의 복권형 종목 비율(`marketShare`) + 성과 근거(KCMI −10.42%)
   *       - `adherence` · `tagCosts` · `streak` · `timing` · `lossAsymmetry` · `outcomeCount` · `outcomesComputedAt` — 판정 배치가 국내
   *         회차로 저장한 결과(국내 청산)로 센다. 모양은 코인 미러와 같다
   *       - 거래 시각은 KST 날짜로 일봉에 붙인다
   *       - 거래가 5,000건을 넘으면 `status: truncated` — 값이 전부 `null`
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: "`{ status, turnover, disposition, nextDaySell, chase, lottery, adherence, tagCosts[], streak, timing, lossAsymmetry, outcomeCount, outcomesComputedAt, tradeCount, minSample, asOf }`"
   *       401: { description: 인증 실패 }
   */
  router.get("/mirror/kr-stock", risk.getKrBehaviorMirror);

  /**
   * @swagger
   * /api/coach/outcomes:
   *   get:
   *     summary: 내 결정 결과(청산) 목록 (F009 FR-14 · FR-18)
   *     description: |
   *       매도 기록 한 건 = 결과 한 건. 최신 청산이 앞. 본인 것만.
   *       순손익은 매수 · 매도 수수료 포함(FIFO 원가). `rMultiple` 은 계획 손절가가 있을 때만,
   *       `heldReturn30d` 는 청산 30일 뒤 종가 기준이라 그 전엔 `null`.
   *       `autoTags` 는 서버 후보, `userTags` 는 사용자가 확정한 것(`tagsConfirmedAt`)
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
   *       - in: query
   *         name: assetType
   *         description: 청산 거래의 자산군(F011 FR-47). 없으면 코인. 국내면 줄마다 종목 `name` · `logoUrl`
   *         schema: { type: string, enum: [crypto, kr_stock], default: crypto }
   *     responses:
   *       200: { description: "`{ outcomes: [...] }`" }
   *       401: { description: 인증 실패 }
   */
  router.get("/outcomes", risk.listDecisionOutcomes);

  /**
   * @swagger
   * /api/coach/outcomes/{id}/tags:
   *   put:
   *     summary: 결과의 실수 태그 확정 (F009 FR-18)
   *     description: |
   *       보낸 배열로 덮어쓴다. 빈 배열은 "실수 없음"으로 확정이다. 자동 후보는 원본으로 남는다.
   *       기본 태그 `chasing` · `averaging_down` · `revenge` · `off_plan` · `late_night`, 그 밖의 문자열은 사용자 정의
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
   *             required: [tags]
   *             properties:
   *               tags:
   *                 type: array
   *                 maxItems: 8
   *                 items: { type: string, minLength: 1, maxLength: 20 }
   *     responses:
   *       200: { description: 고친 결과 }
   *       400: { description: 요청 검증 실패 }
   *       401: { description: 인증 실패 }
   *       404: { description: 결과가 없다(남의 것 포함) }
   */
  router.put("/outcomes/:id/tags", risk.confirmOutcomeTags);

  /**
   * @swagger
   * /api/coach/review/monthly:
   *   get:
   *     summary: 월간 복기 (F009 FR-28 · FR-13)
   *     description: |
   *       한 달(KST)의 미러 요약 · IPS 이탈 일수 · "오를 확률" 채점 · 이번 달 한 가지. 수치는 서버, 문장은 템플릿이다(LLM 없음).
   *
   *       - 월초 배치가 지난달 것을 만들고, 없으면 **첫 조회가 만든다.** 한 번 만든 복기는 고치지 않는다 — 뒤에 태그를
   *         고쳐도 그달에 본 숫자가 남는다(`generatedAt`)
   *       - `month` 가 없으면 KST 지난달. 끝나지 않은 달은 `status: month_not_closed`
   *       - 그달 말까지 거래가 없으면 `no_ledger`, 거래가 5,000건을 넘으면 `truncated` — 둘 다 `review: null`
   *       - `ipsDeviation` 은 **지금 설정** 기준이다(`basis: current_settings` — 설정 이력을 저장하지 않는다).
   *         `scope` — 코인 · 국내 거래가 다 있는 달은 두 자산군 합산(`all_assets`), 아니면 이 판 몫(`asset_type`)
   *         월 손실 예산의 비율 단위는 월초 평가금 대비
   *       - `oneThing` 은 금액이 없는 문장이다. 금액은 `topMistake` 숫자로
   *       - 코인 거래만 센다(`assetType: crypto`). 국내 주식은 `/api/coach/review/monthly/kr-stock`
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: month
   *         schema: { type: string, pattern: "^\\d{4}-(0[1-9]|1[0-2])$", example: "2026-08" }
   *     responses:
   *       200:
   *         description: "`{ assetType, month, status, availableMonths[], review: { month, from, to, generatedAt, activity, adherence, disposition, benchmark, turnover, tagCosts[], topMistake, ipsDeviation, brier, oneThing } | null }`"
   *       400: { description: month 형식 오류 }
   *       401: { description: 인증 실패 }
   */
  router.get("/review/monthly", risk.getMonthlyReview);

  /**
   * @swagger
   * /api/coach/review/monthly/kr-stock:
   *   get:
   *     summary: 월간 복기 국내 주식판 (F011 FR-48)
   *     description: |
   *       코인판(`/api/coach/review/monthly`)과 **같은 모양 · 같은 규칙**이고 국내 주식 거래 · 결과 · 연결 계획 · "오를 확률" 계획
   *       (종목 시세가 국내 주식인 것)만 센다. `assetType: kr_stock`. 코인판과 따로 저장되고(자산군마다 한 벌) 고치지 않는다.
   *
   *       - 거래 시각은 KST 날짜로 일봉에 붙인다. 날은 **거래일**만 걷는다 — 주말 · 휴장일은 IPS 이탈 날이 아니다
   *       - 휴장일 매도의 장부 손익은 직전 거래일 종가, 익절 · 손절 평균 보유 기간은 **거래일**
   *       - 회전율 · 보유 대비는 국내 주식 몫만 본다(코인판도 코인 몫만). IPS 이탈은 그달에 코인 · 국내 거래가 다 있으면 **두 자산군 합산**
   *         (`ipsDeviation.scope: all_assets` — 두 판에 같은 값, 달력일), 아니면 그 판 몫(`asset_type`)
   *       - `brier.recentMisses[].name` — 빗나간 예측의 종목 이름(읽을 때 붙인다, 모르면 `null`). 코인판은 늘 `null`
   *     tags: [Coach Risk]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: month
   *         schema: { type: string, pattern: "^\\d{4}-(0[1-9]|1[0-2])$", example: "2026-09" }
   *     responses:
   *       200:
   *         description: "코인판과 같은 모양 — `assetType: kr_stock`"
   *       400: { description: month 형식 오류 }
   *       401: { description: 인증 실패 }
   */
  router.get("/review/monthly/kr-stock", risk.getKrMonthlyReview);

  return router;
};
