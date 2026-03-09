import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();
const dashbaordController = new DashboardController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Dashboard 조회
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get("/", dashbaordController.getDashboard);

export default router;
