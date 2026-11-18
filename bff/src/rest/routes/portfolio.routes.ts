import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appPortfolioController, positionController, transactionController } from "../controllers/portfolio.controller";

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

/**
 * 거래 기록(F006 G절 2단계) — **주문이 아니다**: 이미 한 거래를 적고 고치고 지운다. 거래소로 나가는 경로 0(FR-85).
 * `preview` 를 `:id` 보다 먼저 — 메서드가 달라 겹치지 않지만 읽는 사람이 헷갈리지 않게
 */
router.get("/transactions", authMiddleware, transactionController.list);
router.post("/transactions/preview", authMiddleware, transactionController.preview);
router.post("/transactions", authMiddleware, transactionController.create);
router.patch("/transactions/:id", authMiddleware, transactionController.update);
router.delete("/transactions/:id", authMiddleware, transactionController.remove);

export default router;
