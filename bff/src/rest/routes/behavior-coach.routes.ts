import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appBehaviorCoachController } from "../controllers/behavior-coach.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", appBehaviorCoachController.get);

export default router;
