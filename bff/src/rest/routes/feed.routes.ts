import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appFeedController } from "../controllers/feed.controller";

const router = Router();

/**
 * Investment Feed
 */
router.get("/", authMiddleware, (req, res) =>
  appFeedController.getFeed(req, res),
);

export default router;
