import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appCoachController } from "../controllers/coach.controller";

/**
 * 코치 리포트 — `/api/app/coach/*` (`BFF-REQ-023` "조립 — 코치 리포트").
 * 종목 판단(`/api/app/ai-coach/detail`)과 다른 화면이다.
 */
const router = Router();

router.use(authMiddleware);
router.get("/report", appCoachController.report);
router.get("/generation-status", appCoachController.generationStatus);

export default router;
