import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { KrStockUseCases, MarketUseCases } from "../application/api";
import { KrStockController } from "./krStock.controller";

/**
 * 국내 주식 조회 경로 — `/api/market/kr` (F011 · `SRV-REQ-040`).
 *
 * 전부 인증 필수 · 소유자 전용(재배포 약관 확인 전). 비회원 · 공개 응답에 국내 주식 시세는 0건이다.
 * 예외 하나 — `/schedule`(공개 일정, 시세 아님)은 소유자 검사 · 키 검사가 없다.
 * 키가 없으면 전 경로 `503 KR_STOCK_DISABLED`, 소유자가 아니거나 없는 종목은 `404 KR_STOCK_NOT_AVAILABLE`.
 * 응답은 저장값이다 — 요청이 KIS 를 부르지 않는다.
 */
export const createKrStockRouter = (
  useCases: KrStockUseCases | null,
  getSchedule: MarketUseCases["getKrMarketSchedule"]
): Router => {
  const router = Router();
  const controller = new KrStockController(useCases, getSchedule);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/market/kr/schedule:
   *   get:
   *     summary: 다가오는 국내 시장 일정(금통위 · 소비자물가 · 수출입 · 선물옵션 동시만기) — 로그인 사용자 전부
   *     description: |
   *       날짜 · 종류 · 남은 날(KST 달력)만. 과거 반응 분포는 없다(전망은 `/api/coach/events`, 소유자 전용).
   *       **이 경로만 예외다** — 소유자 검사가 없고, 국내 주식(KIS 키)이 꺼져 있어도 동작한다. 일정은 예측 DB 뷰
   *       `forecast.v_upcoming_event` 에서 온다(`SRV-REQ-041` FR-5). 지난 일정 · 종목 사건(2단계)은 빠진다.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: days, schema: { type: integer, minimum: 1, maximum: 35, default: 14 } }
   *     responses:
   *       200:
   *         description: 성공 — 없으면 items 빈 배열
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
   *                     days: { type: integer }
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           kind: { type: string, enum: [kr_bok_rate, kr_cpi, kr_trade, kr_quad_expiry] }
   *                           eventAt: { type: string, format: date-time }
   *                           daysUntil: { type: integer, description: "KST 날짜 차이 — 0 = 오늘" }
   *       400: { description: days 형식 오류 }
   *       401: { description: 인증 실패 }
   *       503: { description: "예측 DB 를 읽을 수 없다(`MARKET_SCHEDULE_UNAVAILABLE`)" }
   */
  router.get("/schedule", controller.schedule);

  /**
   * @swagger
   * /api/market/kr/session:
   *   get:
   *     summary: 국내 주식 장 상태(KST) — 소유자 전용
   *     description: |
   *       `session` 은 pre_open · regular · closing_auction · after_hours_close · after_hours_single · closed · holiday.
   *       `calendarKnown=false` 면 오늘이 개장일 달력에 없어 평일 = 개장으로 추정했다.
   *       `holidayName` 은 평일 휴장의 사유(KRX 공시 표 — 표에 없는 임시 휴장은 `null`).
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
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
   *                     session: { type: string }
   *                     now: { type: string, format: date-time }
   *                     lastCloseAt: { type: string, format: date-time, nullable: true }
   *                     nextOpenAt: { type: string, format: date-time, nullable: true }
   *                     calendarKnown: { type: boolean }
   *                     holidayName: { type: string, nullable: true, description: "평일 휴장 사유 — 휴장이 아니거나 표에 없으면 null" }
   *                     provider:
   *                       type: object
   *                       description: KIS 상태(FR-92) — degraded 는 진짜 실패 5회 연속(초과 응답은 세지 않는다)
   *                       properties:
   *                         status: { type: string, enum: [ok, degraded] }
   *                         since: { type: string, format: date-time, nullable: true }
   *                         lastSuccessAt: { type: string, format: date-time, nullable: true }
   *                         realtime:
   *                           type: object
   *                           properties:
   *                             state: { type: string, enum: [idle, connecting, open, backoff, degraded] }
   *                             subscribed: { type: integer }
   *                             lastTickAt: { type: string, format: date-time, nullable: true }
   *       401: { description: 인증 실패 }
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 — 국내 주식 꺼짐 }
   */
  router.get("/session", controller.session);

  /**
   * @swagger
   * /api/market/kr/assets:
   *   get:
   *     summary: 국내 주식 시세 표 — 소유자 전용
   *     description: |
   *       수집 유니버스(관심 ∪ 시총 상위 N) 종목의 저장된 현재가. 금액은 원 정수. 코인 시세 표와 같은 필터 문자열을 받는다
   *       (정렬 · 순서 · 기간). 정렬 기본(`""` · `all`)은 시가총액. `openPrice` · `highPrice` · `lowPrice` 는 당일 시 · 고 · 저.
   *       `periodChange` 는 기간 변동률(%) — 실시간이면 전일 대비와 같고, 기준 일봉(시세 날짜 이전 N 거래일 —
   *       1d 1 · 7d 5 · 1m 21 · 3m 63 · 6m 126 · 1y 250)이 없으면 null. 정렬은 페이지 전에 매기고 값이 없는 종목은 뒤로.
   *       `feed` 는 poll_1m · realtime · stale(시세 받는 시간대에 3분 넘게 갱신 없음).
   *       `logoUrl` 은 종목마다 판정한 logo.dev 로고 주소(도메인 · 티커) — 키가 없거나 선명한 로고가 없으면 null(화면 이니셜).
   *       `status` 는 halted(거래정지) · paused(임시정지) · vi · administrative · caution · warning · danger · attention(투자유의) ·
   *       liquidation(정리매매) · overheat. `vi` 는 VI 발동 중일 때만 `{ kind: static|dynamic|both|null, triggeredAt, count }`.
   *       `lastTradeAt` 은 값이 멈춘 이유(거래정지 · 임시정지 · VI · 그 시장의 서킷브레이커)가 있을 때만 마지막 체결 시각, 평소 null(F016 단계 A).
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 100 } }
   *       - { in: query, name: offset, schema: { type: integer, default: 0 } }
   *       - { in: query, name: sort, schema: { type: string, enum: ["", all, trade_value, change, price, name], default: "" } }
   *       - { in: query, name: order, schema: { type: string, enum: ["", asc, desc], default: desc } }
   *       - { in: query, name: period, schema: { type: string, enum: ["", realtime, 1d, 7d, 1m, 3m, 6m, 1y], default: "" } }
   *       - { in: query, name: codes, schema: { type: string, example: "005930,000660" }, description: "이 코드들만(쉼표 구분 · 최대 100). 보유 요약의 이름 · 로고" }
   *     responses:
   *       200:
   *         description: "`{ session, items: (KrStockQuote & { periodChange })[], nextOffset }`"
   *       400: { description: 정렬 · 순서 · 기간 · 페이지 형식 오류 }
   *       401: { description: 인증 실패 }
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/assets", controller.assets);

  /**
   * @swagger
   * /api/market/kr/search:
   *   get:
   *     summary: 국내 주식 종목 검색(마스터 전체, 이름 · 코드) — 소유자 전용
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: q, required: true, schema: { type: string, minLength: 2, maxLength: 30 } }
   *     responses:
   *       200:
   *         description: "`{ items: [{ code, name, market, inUniverse }] }` 최대 20건, 시총 순"
   *       400: { description: q 형식 오류 }
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/search", controller.search);

  /**
   * @swagger
   * /api/market/kr/indices:
   *   get:
   *     summary: 국내 지수 요약(코스피 · 코스닥) — 소유자 전용
   *     description: |
   *       저장값만 읽는다(수집은 현재가 회차 뒤 매분). 어떤 지수를 어떤 순서로 줄지는 서버 설정 `KIS_SUMMARY_INDICES`.
   *       한 번도 못 받은 지수는 빠진다. `stale` = 시세 시간대인데 3분 넘게 안 바뀜.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: "`{ session, items: [{ code, name, value, change, changeRate, advancers, unchanged, decliners, updatedAt, stale }] }`"
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/indices", controller.indices);

  /**
   * @swagger
   * /api/market/kr/summary:
   *   get:
   *     summary: 국내 주식 시장 요약 띠(대표 지수 · 작은 칸 · 오늘의 시장) — 소유자 전용
   *     description: |
   *       코인 요약(`/api/investment/market/summary`)과 **같은 열** + `assetClass` · `changeBasis` · 칸별 `kind`(SRV-REQ-042).
   *       저장값만 읽는다(요청이 KIS 를 부르지 않는다). 대표 = `KR_SUMMARY_FEATURED`(기본 코스피), 작은 칸 = `KR_SUMMARY_ITEMS`
   *       지수(기본 코스닥) 뒤에 수집 유니버스 순서(보유 → 관심 → 시총)로 9칸까지.
   *       `change24h` · `change24hAmount` 는 **전일 종가 대비**(`changeBasis: prev_close`). 종목 가격 · 금액은 원 정수, 지수는
   *       포인트(소수 둘째 자리). `sparkline` 은 마지막 거래일 장중 5분 간격 종가(지수는 분 기록을 5분으로 줄임) — 없으면 null.
   *       `high24h` · `low24h` · `tradeValue24h` 는 당일 값, 못 받았으면 null. `breadth` 는 코스피 + 코스닥 상승 · 보합 · 하락
   *       종목 수. `headlines` 는 늘 빈 배열(국내 뉴스는 모으지 않는다) — 그 자리는 `schedule`(다가오는 국내 일정 최대 3건).
   *       `marketActions` 는 오늘 시장 조치(서킷브레이커 · 사이드카, F016 단계 A) — `active` · `resumesAt` 은 서버가 정한다.
   *       `source: inferred` 는 지수 분 기록으로 추정한 것(화면이 "추정"을 붙인다).
   *       분 기록 · 5분봉 · 일정 · 시장 조치 중 못 읽은 것이 있으면 `degraded: true`(전체를 실패시키지 않는다).
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
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
   *                     assetClass: { type: string, enum: [kr_stock] }
   *                     changeBasis: { type: string, enum: [prev_close] }
   *                     featured: { $ref: '#/components/schemas/KrSummaryItem' }
   *                     items: { type: array, items: { $ref: '#/components/schemas/KrSummaryItem' } }
   *                     sparklineWindowMinutes: { type: integer, description: "정규장 길이(390)" }
   *                     sparklineDate: { type: string, format: date, nullable: true, description: "스파크라인이 그린 날(KST)" }
   *                     breadth:
   *                       type: object
   *                       nullable: true
   *                       properties: { up: { type: integer }, flat: { type: integer }, down: { type: integer }, total: { type: integer } }
   *                     headlines: { type: array, maxItems: 0, items: { type: object } }
   *                     schedule:
   *                       type: array
   *                       maxItems: 3
   *                       items:
   *                         type: object
   *                         properties:
   *                           kind: { type: string, enum: [kr_bok_rate, kr_cpi, kr_trade, kr_quad_expiry] }
   *                           eventAt: { type: string, format: date-time }
   *                           daysUntil: { type: integer }
   *                     marketActions: { type: array, items: { $ref: '#/components/schemas/KrMarketAction' } }
   *                     degraded: { type: boolean }
   *       401: { description: 인증 실패 }
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 — 국내 주식 꺼짐 }
   * components:
   *   schemas:
   *     KrSummaryItem:
   *       type: object
   *       nullable: true
   *       properties:
   *         symbol: { type: string, description: "지수 4자리 · 종목 6자리 코드" }
   *         kind: { type: string, enum: [index, stock] }
   *         koreanName: { type: string }
   *         logoUrl: { type: string, nullable: true }
   *         currentPrice: { type: number }
   *         change24h: { type: number, description: "전일 대비 변동률(%)" }
   *         change24hAmount: { type: number, description: "전일 대비 금액(원 정수 · 지수는 포인트)" }
   *         tags: { type: array, items: { type: string, enum: [wide_move] } }
   *         sparkline: { type: array, nullable: true, items: { type: number } }
   *         high24h: { type: number, nullable: true }
   *         low24h: { type: number, nullable: true }
   *         tradeValue24h: { type: integer, nullable: true }
   *         priceUpdatedAt: { type: string, format: date-time }
   *     KrMarketAction:
   *       type: object
   *       properties:
   *         market: { type: string, enum: [KOSPI, KOSDAQ] }
   *         kind: { type: string, enum: [circuit_breaker, sidecar] }
   *         stage: { type: integer, description: "서킷브레이커 1 · 2 · 3단계(사이드카 1)" }
   *         direction: { type: string, enum: [up, down] }
   *         startedAt: { type: string, format: date-time }
   *         endedAt: { type: string, format: date-time, nullable: true }
   *         resumesAt: { type: string, format: date-time, nullable: true, description: "재개 예정 — 3단계는 null(그날 종료)" }
   *         source: { type: string, enum: [feed, inferred] }
   *         active: { type: boolean }
   */
  router.get("/summary", controller.summary);

  /**
   * @swagger
   * /api/market/kr/stream:
   *   get:
   *     summary: 국내 주식 실시간 체결 SSE — 소유자 전용
   *     description: |
   *       `event: status` 한 번(`{ state, subscribed, lastTickAt }`) 뒤 `event: tick` 으로 체결 배열
   *       `[{ code, price, change, changeRate, volume, at }]`. 15초마다 주석 하트비트. 정규장 밖에는 체결이 없다.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: "text/event-stream" }
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/stream", controller.stream);

  /**
   * @swagger
   * /api/market/kr/{code}:
   *   get:
   *     summary: 국내 주식 상세 — 현재가 + PER/PBR · 52주 · 외국인 소진율 · 호가 단위
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *     responses:
   *       200:
   *         description: "`{ session, quote: KrStockQuote, detail, marketActions: KrMarketAction[] }` — marketActions 는 이 종목 시장의 오늘 조치"
   *       404: { description: 소유자가 아니거나 수집 유니버스 밖 종목 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code", controller.detail);

  /**
   * @swagger
   * /api/market/kr/{code}/chart:
   *   get:
   *     summary: 국내 주식 캔들(수정주가 일봉 · 5분봉)
   *     description: 5분봉은 실시간 집계(슬라이스 1)부터 쌓인다. `coverage.tradingDays` 로 몇 거래일치인지 준다.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string } }
   *       - { in: query, name: period, schema: { type: string, enum: ["1d", "5m"], default: "1d" } }
   *       - { in: query, name: count, schema: { type: integer, default: 120, maximum: 500 } }
   *     responses:
   *       200:
   *         description: "`{ period, candles[], coverage: { from, to, tradingDays } }`"
   *       404: { description: 소유자가 아님 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code/chart", controller.chart);

  /**
   * @swagger
   * /api/market/kr/{code}/investors:
   *   get:
   *     summary: 국내 주식 투자자 순매수(개인 · 외국인 · 기관) 일별 — 소유자 전용
   *     description: |
   *       저장값만 읽는다(개장일 18:40 KST 수집, 당일 값은 18:00 뒤에만). 순매수 = 매수 − 매도, 금액은 원 정수 ·
   *       수량은 주(문자열). `totals` 는 받은 거래일 합계(행이 없으면 `null`). 마스터에 있는데 아직 안 모였으면 빈 `rows`.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *       - { in: query, name: days, schema: { type: integer, default: 20, minimum: 1, maximum: 30 } }
   *     responses:
   *       200:
   *         description: "`{ code, days, collectedAt, rows: [{ date, individual: { quantity, value }, foreign, institution }], totals }`"
   *       400: { description: days 형식 오류 }
   *       404: { description: 소유자가 아니거나 마스터에 없는 종목 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code/investors", controller.investors);

  /**
   * @swagger
   * /api/market/kr/{code}/orderbook:
   *   get:
   *     summary: 국내 주식 호가 10단계(매도 · 매수 잔량) — 소유자 전용
   *     description: |
   *       저장하지 않고 요청 시점에 KIS 를 부른다. 같은 종목은 10초 안이면 받아 둔 값(`fetchedAt`). 매도 · 매수 모두
   *       1단계(최우선)부터, 가격은 원 정수 · 잔량은 주(문자열). KIS 실패면 받아 둔 값을 `stale: true` 로, 그것도 없으면
   *       `available: false` 빈 호가. `at` 은 KIS 호가 접수 시각.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *     responses:
   *       200:
   *         description: "`{ code, available, asks: [{ price, quantity }], bids, totalAskQuantity, totalBidQuantity, at, fetchedAt, stale }`"
   *       404: { description: 소유자가 아니거나 마스터에 없는 종목 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code/orderbook", controller.orderbook);

  /**
   * @swagger
   * /api/market/kr/{code}/news:
   *   get:
   *     summary: 국내 종목 오늘 소식(시황 · 공시 제목) — 소유자 전용
   *     description: |
   *       저장값만 읽는다(KIS 종합 시황/공시 제목 — 시장 전체를 07~20시 2분마다 수집). 오늘(KST 00:00 뒤) 이 종목에 걸린 제목, 최신이 앞 ·
   *       최대 30건 · 광고성 제외. **본문 · 원문 링크 없음**(원천에 없다 — 시황 본문은 `/{code}/news/{serial}/body`). `kind` 는 `disclosure`(공시) | `news`(시황).
   *       `collectedAt` 은 시장 전체 마지막 수집 시각 — 빈 목록이 "소식 없음"인지 "수집 멈춤"인지 가른다.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *     responses:
   *       200:
   *         description: "`{ code, date, collectedAt, items: [{ id, kind, provider, title, publishedAt, related: [{ code, name, changeRate }] }] }` — related 는 관련 종목(마스터에 있는 것만 · 등락률 % 또는 null)"
   *       404: { description: 소유자가 아니거나 마스터에 없는 종목 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code/news", controller.news);

  /**
   * @swagger
   * /api/market/kr/{code}/news/{serial}/body:
   *   get:
   *     summary: 국내 시황 기사 본문 — 소유자 전용(SRV-REQ-054)
   *     description: |
   *       이 종목에 걸린 시황 제목 하나를 포털 뉴스 검색으로 찾아(제목 겹침 0.8 이상 · 게시 2일 안) 본문 문단을 준다. 캐시 —
   *       찾음은 영구 · 못 찾음은 3시간 · 실패는 30분 뒤 다시 찾는다. 공시는 기사가 아니라 검색 없이 `not_found`. 문단은 글자만.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *       - { in: path, name: serial, required: true, schema: { type: string, pattern: "^\\d{8,24}$" } }
   *     responses:
   *       200:
   *         description: "`{ status: ok | not_found | failed, paragraphs: string[], originalUrl, fetchedAt }`"
   *       404: { description: 소유자가 아님 · 마스터에 없는 종목 · 그 종목에 걸리지 않은 일련번호 }
   *       503: { description: KIS 키 없음(KR_STOCK_DISABLED) 또는 포털 검색 키 없음(NEWS_BODY_UNAVAILABLE) }
   */
  router.get("/:code/news/:serial/body", controller.newsBody);

  /**
   * @swagger
   * /api/market/kr/{code}/flows/intraday:
   *   get:
   *     summary: 국내 종목 장중 수급(프로그램 매매 누적) — 소유자 전용
   *     description: |
   *       저장값만 읽는다(유니버스 종목 정규장 10분마다). 오늘 프로그램 매매 누적(체결)의 가장 최근 값 — 순매수 = 매수 − 매도,
   *       금액은 원 정수 · 수량은 주(문자열) · `at` 은 KIS 체결 시각. 오늘 값이 없으면 `program: null`(장 전 · 휴장 · 유니버스 밖).
   *       외국인 · 기관 장중 값은 없다 — 일별은 `/investors`.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *     responses:
   *       200:
   *         description: "`{ code, date, program: { at, netQuantity, netValue, buyValue, sellValue, collectedAt } | null }`"
   *       404: { description: 소유자가 아니거나 마스터에 없는 종목 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code/flows/intraday", controller.intradayFlows);

  /**
   * @swagger
   * /api/market/kr/{code}/why-moved:
   *   get:
   *     summary: 국내 종목 오늘 왜 움직였나 — ① 등락 분해 · ② 같은 날 사실 · 카드 조건(소유자 전용)
   *     description: |
   *       저장값만 읽는다(F016 단계 C). 원인을 고르지 않는다 — 몫은 뺄셈, 사실은 시각순.
   *       `split` — 오늘 등락(%)을 시장 몫 = β_시장 × 지수 · 업종 몫 = β_업종 × (업종 − 지수) · 종목 몫 = 나머지(%p, 소수 둘째 자리)로.
   *       β 는 예측 배치(`forecast.v_move_beta_export`) — 못 읽으면 β=1 · `method: market_adjusted`. 지수를 못 읽으면 `split: null`.
   *       `show` — |등락| ≥ max(MOVE_CARD_MIN_RATE, MOVE_CARD_K × 평소 변동) 또는 그날 VI · 시장 조치 · 정지 · 경보이고 `split` 이 있을 때.
   *       `facts` — 시황/공시 제목 · VI · 시장 조치 · 정지/경보 상태 · 프로그램 순매수(원). 원천 하나 실패면 그 kind 만 `unavailable`.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: code, required: true, schema: { type: string, pattern: "^[0-9A-Z]{6}$" } }
   *     responses:
   *       200:
   *         description: "`{ code, date, show, reasons[], usualRate, split: { total, market, sector, idio, method, marketIndex, sectorIndex, sectorName } | null, facts: [{ id, kind, at, source, title, value }], unavailable[] }`"
   *       404: { description: 소유자가 아니거나 시세가 없는 종목 }
   *       503: { description: KIS 키 없음 }
   */
  router.get("/:code/why-moved", controller.whyMoved);

  return router;
};
