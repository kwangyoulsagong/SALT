// modules/feed/feed.routes.ts

import { Router } from "express";
import { InvestmentFeedController } from "./feed.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();
const investmentFeedController = new InvestmentFeedController();

router.use(authMiddleware);

/**
 * @swagger
 * /api/feed:
 *   get:
 *     summary: Investment Feed
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", investmentFeedController.getFeed);

export default router;
