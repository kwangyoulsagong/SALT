import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAICoachController } from "../controllers/ai-coach.controller";

const router = Router();

router.use(authMiddleware);
// 해설 · 시나리오 칸별 경로(`/explanation` · `/scenario`)는 2026-11-13 은퇴 — 한 장 패널 `/panel` 안에 온다(F017 v4 1e · `BFF-REQ-052` FR-6).
// 1주 동안 410 + replacement(`gone.middleware` `RETIRED_PATHS`)
router.get("/profile", appAICoachController.getProfile);
router.patch("/profile", appAICoachController.updateProfile);
router.post("/feedback", appAICoachController.feedback);
router.get("/preview", appAICoachController.preview);
router.get("/detail", appAICoachController.detail);
// 사기 전 · 팔기 전 점검(F017 v2 단계 2 · `BFF-REQ-052` FR-3) — 서버 `/api/coach/check`
router.get("/check", appAICoachController.tradeCheck);
// 한 장 패널 — 시나리오 · 점검 · 원인 · 회사 사정 · 성적 · 해설 · 내 기준을 한 콜로(F017 v4 1d · `BFF-REQ-052` FR-6) — 서버 `/api/coach/panel`
router.get("/panel", appAICoachController.panel);
// 해설 스트림(SSE) — 저장본이 없을 때 패널이 연다(F017 v4 1f · `BFF-REQ-052` FR-7) — 서버 `/api/coach/explain/stream`
router.get("/explain/stream", appAICoachController.explainStream);
// 지난 날 해설 — 그날 저장 원문 + 그날 · 그 뒤 등락(`BFF-REQ-057`) — 서버 `/api/ai-coach/explanation/history`.
// 옛 `/explanation`(은퇴 410)보다 이 라우터가 먼저라 하위 경로가 410 에 걸리지 않는다
router.get("/explanation/history", appAICoachController.explanationHistory);

export default router;
