import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appAlertsController } from "../controllers/alerts.controller";

const router = Router();

/**
 * 알림 화면(`BFF-REQ-027` FR-90 · 91 · `BFF-REQ-028`) — 목록(`?page=`) · 안 읽은 수 · 읽음 · 모두 읽음. 서버 경로에 1:1.
 * 만드는 경로는 열지 않는다(FR-93) — 알림은 서버 이벤트 구독으로만 생긴다.
 * `read-all` 을 `/:id/read` 보다 먼저 건다(같은 모양이 아니라 겹치지 않지만 읽는 사람이 헷갈리지 않게).
 */
router.get("/", authMiddleware, (req, res, next) => appAlertsController.getAlerts(req, res, next));
router.get("/unread-count", authMiddleware, (req, res, next) => appAlertsController.getUnreadCount(req, res, next));
router.patch("/read-all", authMiddleware, (req, res, next) => appAlertsController.markAllRead(req, res, next));
router.patch("/:id/read", authMiddleware, (req, res, next) => appAlertsController.markRead(req, res, next));

export default router;
