import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appController } from "../controllers/app.controller";

const router = Router();

/**
 * App Home
 */
router.get("/home", authMiddleware, (req, res, next) =>
  appController.getHome(req, res, next),
);

export default router;
