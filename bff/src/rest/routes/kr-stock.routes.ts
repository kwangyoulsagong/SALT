import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appKrStockController } from "../controllers/kr-stock.controller";

/**
 * 국내 주식 — `/api/app/market/kr/*` (F011 · `BFF-REQ-040`). 전부 인증 필수 · 소유자 전용(판정은 서버).
 * 비회원 · 공개 응답에 국내 주식 시세는 0건이다(KRX 재배포 약관, F011 §정책).
 *
 * `/search` 는 `/:code` 보다 앞이어야 한다 — 뒤에 두면 `search` 가 코드로 잡혀 400 이 된다.
 */
const router = Router();

router.use(authMiddleware);

router.get("/session", appKrStockController.session);
router.get("/overview", appKrStockController.overview);
router.get("/search", appKrStockController.search);
router.get("/:code", appKrStockController.detail);
router.get("/:code/chart", appKrStockController.chart);

export default router;
