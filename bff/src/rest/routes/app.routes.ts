import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appController } from "../controllers/app.controller";

const router = Router();

/**
 * 셸 홈 — 도메인 요약 카드 `{ cards: HomeSummaryCard[], order, hidden }` (`BFF-REQ-046`, 2026-11-02 계약 변경).
 * 카드 하나가 실패 · 800ms 초과면 그 카드만 `state: "degraded"` — 홈은 언제나 200.
 */
router.get("/home", authMiddleware, (req, res, next) =>
  appController.getHome(req, res, next),
);

export default router;
