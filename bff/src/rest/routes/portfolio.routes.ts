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

export default router;
