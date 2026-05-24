import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appSignalPerformanceController } from "../controllers/signal-performance.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", appSignalPerformanceController.get);

export default router;
