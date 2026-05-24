import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appTradePreflightController } from "../controllers/trade-preflight.controller";

const router = Router();

router.use(authMiddleware);
router.post("/", appTradePreflightController.check);

export default router;
