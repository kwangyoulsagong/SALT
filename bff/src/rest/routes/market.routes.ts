import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { marketScreenController } from "../controllers/market-screen.controller";

const router = Router();

router.get("/", authMiddleware, (req, res) =>
  marketScreenController.getMarket(req, res),
);

/** `/:symbol` 보다 앞이어야 한다 — 뒤에 두면 `summary` 가 심볼로 잡혀 인증을 요구한다 */
router.get("/summary", (req, res, next) =>
  marketScreenController.getSummary(req, res, next),
);

router.get("/:symbol", authMiddleware, (req, res) =>
  marketScreenController.getMarketSymbol(req, res),
);

export default router;
