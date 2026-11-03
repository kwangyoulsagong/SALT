import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appSavingsController } from "../controllers/savings.controller";

const router = Router();

/**
 * 저축 (`/api/app/savings`, `BFF-REQ-047`). 서버는 Kotlin `savings` 서비스 — 라우팅 표 `config/server-routes.json` `/savings` → platform.
 * 옛 `/api/goals*` 프록시는 이 경로로 대체돼 은퇴했다(410 `ENDPOINT_RETIRED`, `gone.middleware.ts` `RETIRED_PATHS`).
 */
router.get("/templates", authMiddleware, appSavingsController.templates);
router.post("/calculate", authMiddleware, appSavingsController.calculate);
router.get("/goals", authMiddleware, appSavingsController.goals);
router.post("/goals", authMiddleware, appSavingsController.create);
router.get("/goals/:id", authMiddleware, appSavingsController.goal);
router.post("/goals/:id/deposits", authMiddleware, appSavingsController.deposit);
router.post("/deposits/split", authMiddleware, appSavingsController.split);
// S1b — 저울(저장 안 함) · 확정 · 비상시 비교(저장 안 함) · 실물 단위
router.post("/simulate", authMiddleware, appSavingsController.simulate);
router.put("/goals/plans", authMiddleware, appSavingsController.updatePlans);
router.post("/goals/:id/emergency-compare", authMiddleware, appSavingsController.emergency);
router.post("/goals/:id/units", authMiddleware, appSavingsController.addUnit);
router.delete("/goals/:id/units/:unitId", authMiddleware, appSavingsController.deleteUnit);

export default router;
