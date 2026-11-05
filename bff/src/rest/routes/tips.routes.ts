import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimit } from "../middleware/rateLimit.middleware";
import { tipsController } from "../controllers/tips.controller";

const router = Router();

/**
 * 금융 팁 (`/api/app/tips`, `BFF-REQ-049`). 서버는 Kotlin `content` 서비스 — 라우팅 표 `config/server-routes.json` `/content` → platform.
 * 공개 두 경로는 인증 없음 + IP 제한(FR-5 — 검색 유입 대비, 막는 곳이 비용이 드는 곳보다 앞에). `/for-me` 를 `/:slug` 앞에 둔다.
 */
export const PUBLIC_TIPS_RATE_LIMIT = { windowMs: 60_000, max: 120 };
const publicLimit = rateLimit(PUBLIC_TIPS_RATE_LIMIT);

router.get("/", publicLimit, tipsController.list);
router.get("/for-me", authMiddleware, tipsController.forMe);
router.post("/:slug/dismiss", authMiddleware, tipsController.dismiss);
router.get("/:slug", publicLimit, tipsController.detail);

export default router;
