import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appKrStockController } from "../controllers/kr-stock.controller";

/**
 * 국내 주식 — `/api/app/market/kr/*` (F011 · `BFF-REQ-040`). 전부 인증 필수 · 소유자 전용(판정은 서버).
 * 비회원 · 공개 응답에 국내 주식 시세는 0건이다(KRX 재배포 약관, F011 §정책).
 *
 * `/search` · `/indices` · `/summary` · `/schedule` 은 `/:code` 보다 앞이어야 한다 — 뒤에 두면 코드로 잡혀 400 이 된다.
 */
const router = Router();

router.use(authMiddleware);

router.get("/session", appKrStockController.session);
router.get("/overview", appKrStockController.overview);
router.get("/search", appKrStockController.search);
router.get("/indices", appKrStockController.indices);
// 국내 요약 띠 — 코인 요약과 같은 칸(`BFF-REQ-044`)
router.get("/summary", appKrStockController.summary);
// 다가오는 국내 시장 일정 — 공개 일정(소유자 · 키 검사는 서버가 하지 않는다, `BFF-REQ-043` FR-3)
router.get("/schedule", appKrStockController.schedule);
router.get("/:code", appKrStockController.detail);
router.get("/:code/chart", appKrStockController.chart);
router.get("/:code/investors", appKrStockController.investors);
router.get("/:code/orderbook", appKrStockController.orderbook);
// 오늘 소식 · 장중 수급(F016 단계 B · `BFF-REQ-051` FR-3 · 4)
router.get("/:code/news", appKrStockController.news);
router.get("/:code/flows/intraday", appKrStockController.intradayFlows);

export default router;
