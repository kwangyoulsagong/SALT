import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appPortfolioController } from "../controllers/portfolio.controller";

const router = Router();

/**
 * Portfolio Screen
 */
router.get("/", authMiddleware, (req, res) =>
  appPortfolioController.getPortfolio(req, res),
);

router.get("/summary", authMiddleware, (req, res, next) =>
  appPortfolioController.getSummary(req, res, next),
);

router.get("/performance", authMiddleware, (req, res) =>
  appPortfolioController.getPerformance(req, res),
);

export default router;
