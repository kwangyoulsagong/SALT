import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appController } from "../controllers/app.controller";

const router = Router();

/**
 * App Home
 */
router.get("/home", authMiddleware, (req, res) =>
  appController.getHome(req, res),
);

export default router;
