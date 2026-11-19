import { Router } from "express";

import { planController } from "../controllers/plan.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * 밴드 적립(F003 v2 순서 3 · `BFF-REQ-020` 개정 2026-11-19) — 서버 `/api/plan/*` 다섯을 같은 모양으로.
 * 김프 · 성적 · 실패 사례는 `weekly` 한 응답에 있다(v1 의 `/indicators` · `/kimchi-premium` 은 만들지 않는다)
 */
router.get("/weekly", authMiddleware, planController.getWeekly);
router.post("/weekly/complete", authMiddleware, planController.complete);
router.get("/settings", authMiddleware, planController.getSettings);
router.patch("/settings", authMiddleware, planController.updateSettings);
router.get("/monthly-summary", authMiddleware, planController.getMonthlySummary);

export default router;
