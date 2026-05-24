import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAICoachController } from "../controllers/ai-coach.controller";

const router = Router();

router.use(authMiddleware);
router.get("/profile", appAICoachController.getProfile);
router.patch("/profile", appAICoachController.updateProfile);
router.post("/feedback", appAICoachController.feedback);
router.get("/preview", appAICoachController.preview);
router.get("/detail", appAICoachController.detail);

export default router;
