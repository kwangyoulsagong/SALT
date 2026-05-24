import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appProfitPlanController } from "../controllers/profit-plan.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", appProfitPlanController.get);

export default router;
