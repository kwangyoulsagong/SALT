import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { marketScreenController } from "../controllers/market-screen.controller";

const router = Router();

router.get("/", authMiddleware, (req, res) =>
  marketScreenController.getMarket(req, res),
);

router.get("/:symbol", authMiddleware, (req, res) =>
  marketScreenController.getMarketSymbol(req, res),
);

export default router;
