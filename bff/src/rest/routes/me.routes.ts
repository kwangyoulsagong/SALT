import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAlertsController } from "../controllers/alerts.controller";
import { myDataController } from "../controllers/my-data.controller";
import { privacyController } from "../controllers/privacy.controller";

const router = Router();

/**
 * 계정 설정 (`/api/app/me`, `BFF-REQ-046` FR-8). 지금은 도메인별 알림 설정 — 기본 꺼짐. 서버는 Kotlin notification(`SRV-REQ-048` FR-5).
 * 내 데이터(FR-7, 서버 S3c) — `GET /export`(zip 바로 내려받기, 저장 0) · `DELETE /`(비밀번호 다시 확인 → 서비스마다 → 계정).
 * 개인정보(FR-10, 서버 S3d) — `GET /privacy`(저장하는 것 · AI 로 가는 것). 계측(FR-11) — `POST /usage`(도메인 · 종류 한 번, 204).
 */
router.get("/notifications", authMiddleware, (req, res, next) => appAlertsController.getPrefs(req, res, next));
router.put("/notifications/:domain", authMiddleware, (req, res, next) => appAlertsController.setPref(req, res, next));

router.get("/data-scope", authMiddleware, (req, res) => myDataController.scope(req, res));
router.get("/export", authMiddleware, (req, res, next) => myDataController.exportData(req, res, next));
router.get("/privacy", authMiddleware, (req, res, next) => privacyController.privacy(req, res, next));
router.post("/usage", authMiddleware, (req, res, next) => privacyController.usage(req, res, next));
router.delete("/", authMiddleware, (req, res, next) => myDataController.deleteAccount(req, res, next));

export default router;
