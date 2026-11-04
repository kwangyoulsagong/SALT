import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appHouseholdController } from "../controllers/household.controller";

const router = Router();

/**
 * 가계부 (`/api/app/household`, `BFF-REQ-048`). 서버는 Kotlin `household` 서비스 — 라우팅 표 `config/server-routes.json` `/household` → platform.
 * 목표 시계는 저축 서비스(`/savings/goal-clock`)에서 붙인다.
 */
router.post("/expenses", authMiddleware, appHouseholdController.record);
router.post("/expenses/batch", authMiddleware, appHouseholdController.recordBatch);
router.delete("/expenses/:id", authMiddleware, appHouseholdController.deleteExpense);
router.get("/goal-clock", authMiddleware, appHouseholdController.goalClock);
router.post("/parse", authMiddleware, appHouseholdController.parse);
router.get("/suggestions", authMiddleware, appHouseholdController.suggestions);
router.get("/budget", authMiddleware, appHouseholdController.budget);
router.put("/budget", authMiddleware, appHouseholdController.setBudget);
router.get("/month/:ym", authMiddleware, appHouseholdController.month);

export default router;
