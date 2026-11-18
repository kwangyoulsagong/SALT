import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appPortfolioController, positionController } from "../controllers/portfolio.controller";

const router = Router();

/**
 * Portfolio Screen
 */
router.get("/", authMiddleware, (req, res, next) =>
  appPortfolioController.getPortfolio(req, res, next),
);

router.get("/summary", authMiddleware, (req, res, next) =>
  appPortfolioController.getSummary(req, res, next),
);

router.get("/performance", authMiddleware, (req, res) =>
  appPortfolioController.getPerformance(req, res),
);

/** 포지션(F006 G절) — 개요(Hero · 레이더) · 평가금 흐름(기간 버튼만 다시 부른다) */
router.get("/position", authMiddleware, positionController.getPosition);
router.get("/position/flow", authMiddleware, positionController.getFlow);

export default router;
