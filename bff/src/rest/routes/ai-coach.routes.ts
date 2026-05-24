import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAICoachController } from "../controllers/ai-coach.controller";

const router = Router();

// 프로토타입 데모용 public. TODO before prod: add rate-limit + auth.
router.post("/explain", appAICoachController.explain);

router.use(authMiddleware);
router.get("/profile", appAICoachController.getProfile);
router.patch("/profile", appAICoachController.updateProfile);
router.post("/feedback", appAICoachController.feedback);
router.get("/preview", appAICoachController.preview);
router.get("/detail", appAICoachController.detail);

export default router;
