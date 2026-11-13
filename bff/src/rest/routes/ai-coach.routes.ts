import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAICoachController } from "../controllers/ai-coach.controller";

const router = Router();

router.use(authMiddleware);
// 해설 — 4단 저장값 읽기(F017 v2 단계 3 · `BFF-REQ-052` FR-2). 옛 즉석 해설 `POST /explain` · `/explain/stream` 은 지웠다
router.get("/explanation", appAICoachController.explanation);
router.get("/profile", appAICoachController.getProfile);
router.patch("/profile", appAICoachController.updateProfile);
router.post("/feedback", appAICoachController.feedback);
router.get("/preview", appAICoachController.preview);
router.get("/detail", appAICoachController.detail);
// 사기 전 · 팔기 전 점검(F017 v2 단계 2 · `BFF-REQ-052` FR-3) — 서버 `/api/coach/check`
router.get("/check", appAICoachController.tradeCheck);
// 시나리오 — 모든 종목 · 지평 넷에 늘(과거 실제 결과 · 모델 확률은 소유자 + 시험을 넘은 칸, F017 v4 · `BFF-REQ-052` FR-4) — 서버 `/api/coach/scenario`
router.get("/scenario", appAICoachController.scenario);

export default router;
