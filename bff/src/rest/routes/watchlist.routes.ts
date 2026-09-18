import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appWatchlistController } from "../controllers/watchlist.controller";

const router = Router();

/**
 * 관심 종목 (`/api/app/watchlist`).
 *
 * 기존 `/api/investment/watchlist` 프록시는 **남겨 둔다** — 서버 계약 그대로를 보는
 * 소비처(내부 워커·스크립트)가 있고, 화면 계약과 도메인 계약을 같은 경로에 얹으면
 * 한쪽을 바꿀 때 다른 쪽이 조용히 깨진다.
 */
router.get("/", authMiddleware, appWatchlistController.list);
router.post("/", authMiddleware, appWatchlistController.add);
router.delete("/:id", authMiddleware, appWatchlistController.remove);

export default router;
