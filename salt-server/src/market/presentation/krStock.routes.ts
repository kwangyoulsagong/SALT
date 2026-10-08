import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { KrStockUseCases } from "../application/api";
import { KrStockController } from "./krStock.controller";

/**
 * 국내 주식 조회 경로 — `/api/market/kr` (F011 · `SRV-REQ-040`).
 *
 * 전부 인증 필수 · 소유자 전용(재배포 약관 확인 전). 비회원 · 공개 응답에 국내 주식 시세는 0건이다.
 * 키가 없으면 전 경로 `503 KR_STOCK_DISABLED`, 소유자가 아니거나 없는 종목은 `404 KR_STOCK_NOT_AVAILABLE`.
 * 응답은 저장값이다 — 요청이 KIS 를 부르지 않는다.
 */
export const createKrStockRouter = (useCases: KrStockUseCases | null): Router => {
  const router = Router();
  const controller = new KrStockController(useCases);

  router.use(authMiddleware);

  /**
   * @swagger
   * /api/market/kr/session:
   *   get:
   *     summary: 국내 주식 장 상태(KST) — 소유자 전용
   *     description: |
   *       `session` 은 pre_open · regular · closing_auction · after_hours_close · after_hours_single · closed · holiday.
   *       `calendarKnown=false` 면 오늘이 개장일 달력에 없어 평일 = 개장으로 추정했다.
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
   *       `logoUrl` 은 종목 로고 주소(logo.dev 키가 있으면 logo.dev, 없으면 FMP) — 없는 로고는 404 라 화면이 이니셜로 그린다.
   *       `status` 는 halted · administrative · caution · warning · danger · overheat.
   *     tags: [Market - KR Stock]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 100 } }
   *       - { in: query, name: offset, schema: { type: integer, default: 0 } }
   *       - { in: query, name: sort, schema: { type: string, enum: ["", all, trade_value, change, price, name], default: "" } }
   *       - { in: query, name: order, schema: { type: string, enum: ["", asc, desc], default: desc } }
   *       - { in: query, name: period, schema: { type: string, enum: ["", realtime, 1d, 7d, 1m, 3m, 6m, 1y], default: "" } }
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
   *         description: "`{ session, quote: KrStockQuote, detail }`"
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

  return router;
};
