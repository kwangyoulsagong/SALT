import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAlertsController } from "../controllers/alerts.controller";

const router = Router();

/**
 * Alerts screen
 */
router.get("/", authMiddleware, (req, res, next) =>
  appAlertsController.getAlerts(req, res, next),
);

export default router;
