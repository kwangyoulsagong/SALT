import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAlertsController } from "../controllers/alerts.controller";

const router = Router();

/**
 * Alerts screen
 */
router.get("/", authMiddleware, (req, res) =>
  appAlertsController.getAlerts(req, res),
);

export default router;
