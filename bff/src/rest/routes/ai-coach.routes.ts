import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAICoachController } from "../controllers/ai-coach.controller";

const router = Router();

router.use(authMiddleware);
// 인증 뒤로 옮겼다(`BFF-REQ-023` FR-71). 요청 제한은 서버가 한다(FR-72) — BFF 는 동시 수만 막는다
router.post("/explain", appAICoachController.explain);
router.get("/profile", appAICoachController.getProfile);
router.patch("/profile", appAICoachController.updateProfile);
router.post("/feedback", appAICoachController.feedback);
router.get("/preview", appAICoachController.preview);
router.get("/detail", appAICoachController.detail);

export default router;
