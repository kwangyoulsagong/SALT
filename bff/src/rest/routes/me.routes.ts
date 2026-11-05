import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAlertsController } from "../controllers/alerts.controller";

const router = Router();

/**
 * 계정 설정 (`/api/app/me`, `BFF-REQ-046` FR-8). 지금은 도메인별 알림 설정 — 기본 꺼짐. 서버는 Kotlin notification(`SRV-REQ-048` FR-5).
 * 내 데이터 내보내기 · 삭제(FR-6 · 7)는 identity(S3) 와 같이 이 아래에 붙는다.
 */
router.get("/notifications", authMiddleware, (req, res, next) => appAlertsController.getPrefs(req, res, next));
router.put("/notifications/:domain", authMiddleware, (req, res, next) => appAlertsController.setPref(req, res, next));

export default router;
