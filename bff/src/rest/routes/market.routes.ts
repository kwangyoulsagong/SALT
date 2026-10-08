import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { marketScreenController } from "../controllers/market-screen.controller";
import krStockRoutes from "./kr-stock.routes";

const router = Router();

/** 국내 주식(F011). `/:symbol` 보다 앞이어야 한다 — 뒤에 두면 `kr` 이 코인 심볼로 잡힌다 */
router.use("/kr", krStockRoutes);

router.get("/", authMiddleware, (req, res, next) =>
  marketScreenController.getMarket(req, res, next),
);

/** `/:symbol` 보다 앞이어야 한다 — 뒤에 두면 `summary` 가 심볼로 잡혀 인증을 요구한다 */
router.get("/summary", (req, res, next) =>
  marketScreenController.getSummary(req, res, next),
);

router.get("/:symbol", authMiddleware, (req, res, next) =>
  marketScreenController.getMarketSymbol(req, res, next),
);

export default router;
