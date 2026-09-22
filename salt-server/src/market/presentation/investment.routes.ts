import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { MarketUseCases } from "../application/api";
import { InvestmentController } from "./investment.controller";

/**
 * 시세·관심목록 경로. **`/api/investment` 을 그대로 유지한다** (FR-35).
 *
 * 컨텍스트 이름(`market`)과 경로 이름(`investment`)이 다르다 — 경로 변경은 BFF·프론트
 * 계약 변경이고 프론트가 먼저다 (`ddd-presentation.md` §7).
 */
export const createInvestmentRouter = (useCases: MarketUseCases): Router => {
  const router = Router();
  const investmentController = new InvestmentController(useCases);

  // ==================== 🔓 PUBLIC ENDPOINTS (인증 불필요) ====================

  /**
   * @swagger
   * /api/investment/market/overview:
   *   get:
   *     summary: 암호화폐 마켓 전체 조회 (필터/정렬/페이지네이션) - PUBLIC
   *     tags: [Investment - Public]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *           default: 100
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [trade_value, change, price, name]
   *         description: 정렬 기준 (거래대금, 변동률, 가격, 이름)
   *       - in: query
   *         name: order
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *         description: 정렬 방향
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: ["", realtime, 1d, 7d, 1m, 3m, 6m, 1y]
   *         description: |
   *           변동률 기간. 비우거나 `realtime` 이면 거래소 24시간 변동률이다.
   *           `1d` 는 5분봉 롤링 24시간, 그 이상은 일봉 종가 기준이다.
   *           `sort=change` 와 함께 주면 이 기간 변동률로 정렬한다(기준이 없는 종목은 뒤로).
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 심볼/한글/영문명 검색
   *     responses:
   *       200:
   *         description: |
   *           마켓 전체 정보. 각 항목에 `periodChange`(선택한 기간의 변동률 %)가 있다.
   *           기준 캔들이 없으면(상장 기간이 짧거나 수집 누락) `null` 이다.
   *       422:
   *         description: 모르는 `period` (`MARKET_OVERVIEW_PERIOD_UNSUPPORTED`)
   */
  router.get("/market/overview", investmentController.getMarketOverview);

  /**
   * @swagger
   * /api/investment/market/summary:
   *   get:
   *     summary: 투자 화면 시장 요약 띠 (대표 1 + 항목) - PUBLIC
   *     tags: [Investment - Public]
   *     description: |
   *       **무엇을 요약할지는 서버 설정(`MARKET_SUMMARY_SYMBOLS`)이 정한다** — 첫 심볼이 `featured` 다.
   *       값은 저장 시세이고, `sparkline` 은 5분봉 종가(시간순, `sparklineWindowMinutes` 분)다.
   *       `tags` 는 코드다(`wide_move` — 24시간 변동률이 임계 이상). 방향을 말하지 않는다.
   *       `change24hAmount` 는 원 단위 정수로 반올림한 24시간 등락 금액이다.
   *       `breadth` 는 활성 종목의 24시간 오름 · 내림 · 그대로 수(과거 사실). 세지 못하면 `null`.
   *       `headlines` 는 대표 종목의 최근 뉴스 최대 3건(매체 꼬리를 떼고 같은 제목은 합친다).
   *       스파크라인 · 분위기를 못 받으면 그 자리만 `null` + `degraded: true`.
   *     responses:
   *       200:
   *         description: "`{ featured, items[], sparklineWindowMinutes, breadth, headlines[], degraded }`"
   */
  router.get("/market/summary", investmentController.getMarketSummary);

  /**
   * @swagger
   * /api/investment/crypto/{symbol}/price:
   *   get:
   *     summary: 실시간 가격 조회 - PUBLIC
   *     tags: [Investment - Public]
   *     parameters:
   *       - in: path
   *         name: symbol
   *         required: true
   *         schema:
   *           type: string
   *         description: 암호화폐 심볼 (예 BTC, ETH)
   *     responses:
   *       200:
   *         description: 실시간 가격 정보
   */
  router.get("/crypto/:symbol/price", investmentController.getRealTimePrice);

  /**
   * @swagger
   * /api/investment/crypto/{symbol}/chart:
   *   get:
   *     summary: 차트 데이터 조회 - PUBLIC
   *     tags: [Investment - Public]
   *     parameters:
   *       - in: path
   *         name: symbol
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [day, minute]
   *         description: |
   *           없으면 `day`. **모르는 값은 422 다** — 조용히 기본값으로 떨어뜨리지 않는다
   *           (`FE-REQ-010` FR-51). `week`·`month` 는 아직 없다.
   *       - in: query
   *         name: unit
   *         scehma: number
   *         enum: [1,3,5, 15, 30, 60, 240]
   *       - in: query
   *         name: count
   *         schema:
   *           type: number
   *     responses:
   *       200:
   *         description: 차트 데이터
   *       422:
   *         description: 알 수 없는 `period` (`MARKET_CHART_PERIOD_UNSUPPORTED`)
   */
  router.get("/crypto/:symbol/chart", investmentController.getChartData);

  // ==================== 🔒 PROTECTED ENDPOINTS (인증 필요) ====================

  /**
   * @swagger
   * /api/investment/watchlist:
   *   post:
   *     summary: 관심 목록에 추가
   *     tags: [Investment - Protected]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - assetType
   *               - symbol
   *               - name
   *             properties:
   *               assetType:
   *                 type: string
   *                 enum: [crypto, stock]
   *               symbol:
   *                 type: string
   *               name:
   *                 type: string
   *     responses:
   *       201:
   *         description: 관심 목록 추가 성공
   */
  router.post("/watchlist", authMiddleware, investmentController.addToWatchlist);

  /**
   * @swagger
   * /api/investment/watchlist:
   *   get:
   *     summary: 관심 목록 조회
   *     tags: [Investment - Protected]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: assetType
   *         schema:
   *           type: string
   *           enum: [crypto, stock]
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *         description: 기본 20
   *     responses:
   *       200:
   *         description: |
   *           관심 목록. `currentPrice`·`priceChange24h` 는 **숫자 또는 null** 이다 —
   *           행에 적힌 값과 자산 표의 저장 시세 중 `priceUpdatedAt` 이 늦은 쪽을 담는다
   *           (`SRV-REQ-008` FR-33). 없으면 `null` 이고 0 으로 떨어뜨리지 않는다.
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
   *                           id:
   *                             type: string
   *                           assetType:
   *                             type: string
   *                             enum: [crypto, stock]
   *                           symbol:
   *                             type: string
   *                           name:
   *                             type: string
   *                           currentPrice:
   *                             type: number
   *                             nullable: true
   *                           priceChange24h:
   *                             type: number
   *                             nullable: true
   *                           priceUpdatedAt:
   *                             type: string
   *                             format: date-time
   *                             nullable: true
   *                           logoUrl:
   *                             type: string
   *                             nullable: true
   *                             description: 크립토만. 주식은 null
   *                           addedAt:
   *                             type: string
   *                             format: date-time
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: number
   *                         limit:
   *                           type: number
   *                         total:
   *                           type: number
   *                         totalPages:
   *                           type: number
   *       401:
   *         description: 인증 실패
   */
  router.get("/watchlist", authMiddleware, investmentController.getWatchlist);

  /**
   * @swagger
   * /api/investment/watchlist/{id}:
   *   delete:
   *     summary: 관심 목록에서 제거
   *     tags: [Investment - Protected]
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
   *         description: 제거 성공
   */
  router.delete(
    "/watchlist/:id",
    authMiddleware,
    investmentController.removeFromWatchlist
  );

  // ==================== 🔧 INTERNAL API (BFF용 - 인증 없음) ====================

  /**
   * @swagger
   * /api/investment/internal/symbols:
   *   get:
   *     summary: 모든 관심목록 심볼 조회 (내부 API)
   *     tags: [Investment - Internal]
   *     responses:
   *       200:
   *         description: 심볼 목록
   */
  router.get("/internal/symbols", investmentController.getAllSymbols);

  /**
   * @swagger
   * /api/investment/internal/update-prices:
   *   post:
   *     summary: 관심목록 가격 일괄 업데이트 (내부 API)
   *     tags: [Investment - Internal]
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
   *                     priceChange24h:
   *                       type: number
   *     responses:
   *       200:
   *         description: 업데이트 성공
   */
  router.post("/internal/update-prices", investmentController.updatePrices);

  /**
   * @swagger
   * /api/investment/internal/market/symbols:
   *   get:
   *     summary: 모든 마켓 심볼 조회 (내부 API)
   *     tags: [Investment - Internal]
   *     description: BFF Worker가 전체 실시간 구독을 위해 사용하는 API입니다. 인증이 필요하지 않습니다.
   *     responses:
   *       200:
   *         description: 심볼 목록
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: ["BTC", "ETH", "DOGE", "XRP", "SOL"]
   */
  router.get(
    "/internal/market/symbols",
    investmentController.getAllMarketSymbols
  );

  return router;
};
